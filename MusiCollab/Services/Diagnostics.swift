import Foundation
import os.log

enum MusiCollabDiagnostics {
    private static let log = OSLog(subsystem: Bundle.main.bundleIdentifier ?? "com.example.MusiCollab", category: "runtime")

    static func error(_ message: String) {
        os_log("%{public}@", log: log, type: .error, message)
    }

    static func warning(_ message: String) {
        os_log("%{public}@", log: log, type: .default, message)
    }
}
