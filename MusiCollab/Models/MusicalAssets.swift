import Foundation

enum MusicalAssetModel {
    static let version = 1
}

enum MusicalAssetType: String, Codable {
    case track
    case instrument
    case loop
    case sample
    case scene
    case slice
}

struct MusicalSlice: Codable, Equatable {
    var id: String
    var name: String
    var start: TimeInterval
    var end: TimeInterval
}

struct AssetLicense: Codable, Equatable {
    var type: String
    var attribution: String
    var url: String?
}

struct AssetTransfer: Codable, Equatable {
    var kind: String
    var url: String?
    var reference: String?
    var hash: String?
    var sizeBytes: Double?
    var expiresAt: Double?
}

struct SlicePadMapping: Codable, Equatable {
    var sampleID: String
    var sceneID: String?
    var assignments: [String: String?]
}

struct MusicalAsset: Codable, Equatable {
    var modelVersion: Int = MusicalAssetModel.version
    var id: String
    var type: MusicalAssetType
    var name: String
    var tags: [String]
    var license: AssetLicense?
    var bpm: Double?
    var key: String?
    var duration: TimeInterval?
    var bars: Int?
    var quantization: String?
    var sampleRate: Double?
    var channels: Int?
    var hash: String?
    var transfer: AssetTransfer?
    var slices: [MusicalSlice]?
    var trackIDs: [String]?
    var parameters: [String: Double]?
}
