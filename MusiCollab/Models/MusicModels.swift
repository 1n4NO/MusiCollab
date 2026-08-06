import Foundation

enum MusicEventType: String, Codable {
    case padHit
    case tempoChanged
    case transportChanged
    case loopChanged
    case sliceTriggered
}

struct MusicEvent: Codable {
    let id: UUID
    let type: MusicEventType
    let trackID: String
    let value: Double
    let beat: Double
    let sentAt: TimeInterval

    init(type: MusicEventType, trackID: String, value: Double, beat: Double = 0) {
        self.id = UUID()
        self.type = type
        self.trackID = trackID
        self.value = value
        self.beat = beat
        self.sentAt = Date().timeIntervalSince1970
    }
}

struct LoopTrack {
    let name: String
    let colorName: String
    var isMuted: Bool
    var isArmed: Bool
}
