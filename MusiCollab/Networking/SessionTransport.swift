import Foundation

protocol SessionTransport: AnyObject {
    var onMessage: (([String: Any]) -> Void)? { get set }
    var onConnectionChanged: ((Bool) -> Void)? { get set }
    func connect(room: String, clientID: String, name: String, role: String)
    func send(eventType: String, payload: [String: Any])
}

@available(iOS 13.0, *)
final class SessionWebSocketClient: NSObject, SessionTransport {
    var onMessage: (([String: Any]) -> Void)?
    var onConnectionChanged: ((Bool) -> Void)?

    private var task: URLSessionWebSocketTask?
    private let session: URLSession
    private let url: URL
    private var connectionDetails: (room: String, clientID: String, name: String, role: String)?
    private var retryWorkItem: DispatchWorkItem?
    private var retryDelay: TimeInterval = 1

    init(url: URL) {
        self.url = url
        self.session = URLSession(configuration: .default)
        super.init()
    }

    func connect(room: String, clientID: String, name: String, role: String) {
        connectionDetails = (room, clientID, name, role)
        retryWorkItem?.cancel()
        task?.cancel(with: .goingAway, reason: nil)
        task = session.webSocketTask(with: url)
        task?.resume()
        sendJSON(["type": "hello", "room": room, "clientID": clientID, "name": name, "role": role])
        receiveNext()
    }

    func send(eventType: String, payload: [String: Any]) {
        sendJSON(["type": "event", "eventType": eventType, "payload": payload])
    }

    private func sendJSON(_ object: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object), let text = String(data: data, encoding: .utf8) else { return }
        task?.send(.string(text)) { [weak self] error in
            guard let error else { return }
            print("MusiCollab WebSocket send failed: \(error.localizedDescription)")
            self?.scheduleRetry()
        }
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

    private func scheduleRetry() {
        guard connectionDetails != nil, retryWorkItem == nil else { return }
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
