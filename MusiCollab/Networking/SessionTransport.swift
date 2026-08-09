import Foundation
import Network

protocol SessionTransport: AnyObject {
    var onMessage: (([String: Any]) -> Void)? { get set }
    var onConnectionChanged: ((Bool) -> Void)? { get set }
    func connect(room: String, clientID: String, name: String, role: String)
    func send(eventType: String, payload: [String: Any])
    func resync()
    func suspend()
    func resume()
}

@available(iOS 13.0, *)
final class SessionWebSocketClient: NSObject, SessionTransport {
    var onMessage: (([String: Any]) -> Void)?
    var onConnectionChanged: ((Bool) -> Void)?
    var onClockQuality: ((Int, Int) -> Void)?

    private var task: URLSessionWebSocketTask?
    private let session: URLSession
    private let url: URL
    private let pathMonitor = NWPathMonitor()
    private let pathQueue = DispatchQueue(label: "com.musicollab.network-path")
    private var connectionDetails: (room: String, clientID: String, name: String, role: String)?
    private var sessionToken: String?
    private var retryWorkItem: DispatchWorkItem?
    private var retryDelay: TimeInterval = 1
    private var clockSyncTimer: Timer?
    private var clockSamples: [(offset: Int, rtt: Int)] = []
    private var previousBestOffset: Int?
    private var lastSnapshotAt = Date().timeIntervalSince1970 * 1000
    private var pendingCommands: [String: (eventType: String, payload: [String: Any], eventID: String, attempts: Int)] = [:]
    private var suspended = false
    private var serverInstanceID: String?

    init(url: URL) {
        self.url = url
        self.session = URLSession(configuration: .default)
        self.sessionToken = UserDefaults.standard.string(forKey: "musicollab.sessionToken")
        super.init()
        pathMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self else { return }
                if path.status == .satisfied && !self.suspended { self.scheduleRetry() }
                if path.status != .satisfied { self.onConnectionChanged?(false) }
            }
        }
        pathMonitor.start(queue: pathQueue)
    }

    deinit { pathMonitor.cancel() }

    func connect(room: String, clientID: String, name: String, role: String) {
        suspended = false
        connectionDetails = (room, clientID, name, role)
        retryWorkItem?.cancel()
        task?.cancel(with: .goingAway, reason: nil)
        clockSyncTimer?.invalidate()
        task = session.webSocketTask(with: url)
        task?.resume()
        var hello: [String: Any] = ["type": "hello", "room": room, "clientID": clientID, "name": name, "role": role]
        if let sessionToken { hello["sessionToken"] = sessionToken }
        sendJSON(hello)
        clockSyncTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            self?.sendClockPing()
        }
        sendClockPing()
        receiveNext()
    }

    func send(eventType: String, payload: [String: Any]) {
        let requestID = UUID().uuidString
        pendingCommands[requestID] = (eventType: eventType, payload: payload, eventID: UUID().uuidString, attempts: 0)
        dispatchCommand(requestID)
    }

    func resync() {
        guard !suspended else { return }
        guard task != nil else { scheduleRetry(); return }
        clockSamples.removeAll()
        previousBestOffset = nil
        sendJSON(["type": "requestSnapshot", "requestID": UUID().uuidString])
        sendClockPing()
    }

    func suspend() {
        suspended = true
        retryWorkItem?.cancel()
        retryWorkItem = nil
        clockSyncTimer?.invalidate()
        clockSyncTimer = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
        onConnectionChanged?(false)
    }

    func resume() {
        suspended = false
        guard let details = connectionDetails else { return }
        connect(room: details.room, clientID: details.clientID, name: details.name, role: details.role)
    }

    private func sendJSON(_ object: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object), let text = String(data: data, encoding: .utf8) else { return }
        task?.send(.string(text)) { [weak self] error in
            guard let error else { return }
            print("MusiCollab WebSocket send failed: \(error.localizedDescription)")
            self?.task = nil
            self?.scheduleRetry()
        }
    }

    private func dispatchCommand(_ requestID: String) {
        guard var command = pendingCommands[requestID] else { return }
        guard command.attempts < 4 else {
            pendingCommands.removeValue(forKey: requestID)
            print("MusiCollab command failed after 4 delivery attempts: \(command.eventType)")
            return
        }
        guard task != nil else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in self?.dispatchCommand(requestID) }
            return
        }
        command.attempts += 1
        pendingCommands[requestID] = command
        sendJSON(["type": "event", "eventType": command.eventType, "eventID": command.eventID, "requestID": requestID, "clientSentAt": Date().timeIntervalSince1970 * 1000, "payload": command.payload])
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in self?.dispatchCommand(requestID) }
    }

    private func receiveNext() {
        task?.receive { [weak self] result in
            guard let self else { return }
            DispatchQueue.main.async {
                switch result {
                case .success(let message):
                    self.retryDelay = 1
                    self.onConnectionChanged?(true)
                    if case .string(let text) = message, let data = text.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        if object["type"] as? String == "welcome" {
                            if let instance = object["serverInstanceID"] as? String {
                                if let previous = self.serverInstanceID, previous != instance {
                                    self.clockSamples.removeAll()
                                    self.previousBestOffset = nil
                                    self.pendingCommands = self.pendingCommands.mapValues { (eventType: $0.eventType, payload: $0.payload, eventID: $0.eventID, attempts: 0) }
                                    print("MusiCollab server restart detected; awaiting clean snapshot")
                                }
                                self.serverInstanceID = instance
                            }
                            if let token = object["sessionToken"] as? String {
                                self.sessionToken = token
                                UserDefaults.standard.set(token, forKey: "musicollab.sessionToken")
                            }
                            self.pendingCommands.keys.forEach { self.dispatchCommand($0) }
                        }
                        if let requestID = object["requestID"] as? String, object["type"] as? String == "ack" || object["type"] as? String == "error" {
                            self.pendingCommands.removeValue(forKey: requestID)
                        }
                        if object["type"] as? String == "snapshot" {
                            self.lastSnapshotAt = Date().timeIntervalSince1970 * 1000
                        }
                        if object["type"] as? String == "pong",
                           let clientTime = object["clientTime"] as? Double,
                           let serverTime = object["serverTime"] as? Double {
                            let receivedTime = Date().timeIntervalSince1970 * 1000
                            let rtt = max(0, receivedTime - clientTime)
                            let offset = Int((serverTime - ((clientTime + receivedTime) / 2)).rounded())
                            let roundTrip = Int(rtt.rounded())
                            self.clockSamples.append((offset: offset, rtt: roundTrip))
                            if self.clockSamples.count > 8 { self.clockSamples.removeFirst() }
                            if let best = self.clockSamples.min(by: { $0.rtt < $1.rtt }) {
                                self.onClockQuality?(best.offset, best.rtt)
                                let jitter = self.previousBestOffset.map { abs(best.offset - $0) } ?? 0
                                self.previousBestOffset = best.offset
                                self.sendJSON(["type": "metrics", "offsetMs": best.offset, "rttMs": best.rtt, "jitterMs": jitter, "lastSnapshotAt": self.lastSnapshotAt])
                            }
                        }
                        self.onMessage?(object)
                    }
                    self.receiveNext()
                case .failure(let error):
                    print("MusiCollab WebSocket receive failed: \(error.localizedDescription)")
                    self.task = nil
                    self.onConnectionChanged?(false)
                    self.scheduleRetry()
                }
            }
        }
    }

    private func sendClockPing() {
        let clientTime = Date().timeIntervalSince1970 * 1000
        sendJSON(["type": "ping", "clientTime": clientTime])
    }

    private func scheduleRetry() {
        guard !suspended, connectionDetails != nil, task == nil, retryWorkItem == nil else { return }
        let delay = retryDelay
        retryDelay = min(retryDelay * 2, 10)
        let workItem = DispatchWorkItem { [weak self] in
            guard let self, let details = self.connectionDetails else { return }
            self.retryWorkItem = nil
            self.connect(room: details.room, clientID: details.clientID, name: details.name, role: details.role)
        }
        retryWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }
}
