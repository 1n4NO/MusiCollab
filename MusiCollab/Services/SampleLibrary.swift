import AVFoundation
import Foundation

struct ImportedSample {
    let url: URL
    let duration: TimeInterval
    let sampleRate: Double
    let channelCount: AVAudioChannelCount
}

final class SampleLibrary {
    private(set) var importedSamples: [ImportedSample] = []

    init() {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("MusiCollab/Samples", isDirectory: true)
        guard let files = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else { return }
        files.filter { $0.pathExtension.lowercased() == "m4a" }.forEach { _ = importSample(from: $0) }
    }

    @discardableResult
    func importSample(from url: URL) -> ImportedSample? {
        guard url.isFileURL, let file = try? AVAudioFile(forReading: url) else { return nil }
        let sample = ImportedSample(
            url: url,
            duration: Double(file.length) / file.fileFormat.sampleRate,
            sampleRate: file.fileFormat.sampleRate,
            channelCount: file.fileFormat.channelCount
        )
        importedSamples.append(sample)
        return sample
    }

    func recordingURL() throws -> URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("MusiCollab/Samples", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent("MusiCollab-\(UUID().uuidString).m4a")
    }

    func sliceBoundaries(for sample: ImportedSample, count: Int = 8) -> [ClosedRange<Double>] {
        guard count > 0 else { return [] }
        let width = sample.duration / Double(count)
        return (0..<count).map {
            let start = Double($0) * width
            return start...(start + width)
        }
    }

    func remove(_ sample: ImportedSample) {
        importedSamples.removeAll { $0.url == sample.url }
        let temporaryPath = FileManager.default.temporaryDirectory.standardizedFileURL.path
        let applicationSupportPath = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].standardizedFileURL.path
        if sample.url.standardizedFileURL.path.hasPrefix(temporaryPath) || sample.url.standardizedFileURL.path.hasPrefix(applicationSupportPath) {
            try? FileManager.default.removeItem(at: sample.url)
        }
    }
}
