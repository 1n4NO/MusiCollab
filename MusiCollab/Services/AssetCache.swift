import Foundation

#if canImport(CryptoKit)
import CryptoKit
#endif

struct AssetCacheEntry: Codable {
    let assetID: String
    let fileName: String
    let sizeBytes: Int
    let hash: String?
    var lastAccess: Date
}

enum AssetCacheResult {
    case cached(URL, verified: Bool)
    case metadataOnly
    case failed(String)
}

@available(iOS 13.0, *)
final class AssetCache {
    static let shared = AssetCache()

    private let fileManager = FileManager.default
    private let queue = DispatchQueue(label: "com.musıc.collab.asset-cache")
    private let maxBytes = 512 * 1024 * 1024
    private let maxRetries = 2
    private var entries: [String: AssetCacheEntry] = [:]

    private lazy var directory: URL = {
        let base = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let directory = base.appendingPathComponent("MusiCollab/Assets", isDirectory: true)
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }()

    private lazy var manifestURL: URL = directory.appendingPathComponent("manifest.json")

    private init() {
        loadManifest()
    }

    func cachedURL(for asset: MusicalAsset) -> URL? {
        var result: URL?
        queue.sync {
            guard let entry = entries[asset.id] else { return }
            let url = directory.appendingPathComponent(entry.fileName)
            guard fileManager.fileExists(atPath: url.path) else {
                entries.removeValue(forKey: asset.id)
                saveManifest()
                return
            }
            entries[asset.id]?.lastAccess = Date()
            result = url
            saveManifest()
        }
        return result
    }

    func cache(_ asset: MusicalAsset, completion: @escaping (AssetCacheResult) -> Void) {
        guard let transfer = asset.transfer else {
            completion(.metadataOnly)
            return
        }
        if let existing = cachedURL(for: asset) {
            completion(.cached(existing, verified: true))
            return
        }
        guard transfer.kind == "url", let stringURL = transfer.url, let remoteURL = URL(string: stringURL), ["http", "https"].contains(remoteURL.scheme?.lowercased() ?? "") else {
            completion(.metadataOnly)
            return
        }
        download(asset: asset, url: remoteURL, attempt: 0, completion: completion)
    }

    private func download(asset: MusicalAsset, url: URL, attempt: Int, completion: @escaping (AssetCacheResult) -> Void) {
        URLSession.shared.downloadTask(with: url) { [weak self] temporaryURL, response, error in
            guard let self else { return }
            if let temporaryURL, error == nil {
                let expectedSize = asset.transfer?.sizeBytes
                let actualSize = (try? self.fileManager.attributesOfItem(atPath: temporaryURL.path)[.size] as? NSNumber)?.intValue ?? 0
                if let expectedSize, Int(expectedSize) != actualSize {
                    self.retryOrFail(asset: asset, url: url, attempt: attempt, message: "Downloaded size does not match metadata.", completion: completion)
                    return
                }
                let verified = self.matchesHash(temporaryURL, expected: asset.transfer?.hash ?? asset.hash)
                if (asset.transfer?.hash != nil || asset.hash != nil) && !verified {
                    self.retryOrFail(asset: asset, url: url, attempt: attempt, message: "Downloaded hash does not match metadata.", completion: completion)
                    return
                }
                let fileName = "\(asset.id).audio"
                let destination = self.directory.appendingPathComponent(fileName)
                do {
                    if self.fileManager.fileExists(atPath: destination.path) { try self.fileManager.removeItem(at: destination) }
                    try self.fileManager.moveItem(at: temporaryURL, to: destination)
                    self.queue.sync {
                        self.entries[asset.id] = AssetCacheEntry(assetID: asset.id, fileName: fileName, sizeBytes: actualSize, hash: asset.transfer?.hash ?? asset.hash, lastAccess: Date())
                        self.evictIfNeeded()
                        self.saveManifest()
                    }
                    completion(.cached(destination, verified: verified))
                } catch {
                    self.retryOrFail(asset: asset, url: url, attempt: attempt, message: error.localizedDescription, completion: completion)
                }
                return
            }
            self.retryOrFail(asset: asset, url: url, attempt: attempt, message: error?.localizedDescription ?? "Download failed.", completion: completion)
        }.resume()
    }

    private func retryOrFail(asset: MusicalAsset, url: URL, attempt: Int, message: String, completion: @escaping (AssetCacheResult) -> Void) {
        guard attempt < maxRetries else {
            completion(.failed(message))
            return
        }
        let delay = pow(2.0, Double(attempt))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.download(asset: asset, url: url, attempt: attempt + 1, completion: completion)
        }
    }

    private func matchesHash(_ url: URL, expected: String?) -> Bool {
        guard let expected else { return true }
        #if canImport(CryptoKit)
        guard let data = try? Data(contentsOf: url) else { return false }
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        return digest.caseInsensitiveCompare(expected) == .orderedSame
        #else
        return false
        #endif
    }

    private func evictIfNeeded() {
        var total = entries.values.reduce(0) { $0 + $1.sizeBytes }
        for entry in entries.values.sorted(by: { $0.lastAccess < $1.lastAccess }) where total > maxBytes {
            let url = directory.appendingPathComponent(entry.fileName)
            try? fileManager.removeItem(at: url)
            entries.removeValue(forKey: entry.assetID)
            total -= entry.sizeBytes
        }
    }

    private func loadManifest() {
        guard let data = try? Data(contentsOf: manifestURL),
              let loaded = try? JSONDecoder().decode([String: AssetCacheEntry].self, from: data) else { return }
        entries = loaded
    }

    private func saveManifest() {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        try? data.write(to: manifestURL, options: .atomic)
    }
}
