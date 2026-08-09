import AVFoundation

extension Notification.Name {
    static let musiCollabAudioStatus = Notification.Name("MusiCollabAudioStatus")
}

protocol InstrumentVoice: AnyObject {
    var preset: InstrumentPreset { get }
    func trigger(note: UInt8, velocity: UInt8)
    func stop(note: UInt8)
}

final class AudioEngine: InstrumentVoice {
    let engine = AVAudioEngine()
    private var drumNodes: [AVAudioPlayerNode] = []
    private var drumBuffers: [UInt8: AVAudioPCMBuffer] = [:]
    private var nextVoiceByPad = Array(repeating: 0, count: 8)
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    private let audioSession = AVAudioSession.sharedInstance()
    private(set) var preset = InstrumentPreset(instrumentID: "drums", instrument: "drums", name: "Drums", family: "percussion", parameters: ["voiceCount": 8, "character": 0.35])
    private var instrument: String { preset.instrument }
    private var pitchSemitones: Int { preset.pitch }
    private var parameters: [String: Double] { preset.parameters }
    private var trackVolume = 1.0
    private var trackMuted = false
    private var soloTrackID: String?

    init() {
        // Two voices per pad allow a fast retrigger to overlap naturally instead
        // of cutting off the previous hit on the same player node.
        for _ in 0..<16 {
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode, format: format)
            drumNodes.append(node)
        }
        engine.prepare()

        let notifications = NotificationCenter.default
        notifications.addObserver(self, selector: #selector(handleInterruption(_:)), name: AVAudioSession.interruptionNotification, object: audioSession)
        notifications.addObserver(self, selector: #selector(handleRouteChange(_:)), name: AVAudioSession.routeChangeNotification, object: audioSession)
        notifications.addObserver(self, selector: #selector(handleMediaServicesReset), name: AVAudioSession.mediaServicesWereResetNotification, object: audioSession)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    func start() {
        do {
            try audioSession.setCategory(.playback, mode: .default, options: [.allowBluetoothA2DP])
            try audioSession.setActive(true)
            if !engine.isRunning {
                try engine.start()
            }
            postStatus("Audio ready")
        } catch {
            postStatus("Audio unavailable — tap a pad to retry")
            print("MusiCollab audio start failed: \(error.localizedDescription)")
        }
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let rawType = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: rawType) else { return }

        switch type {
        case .began:
            engine.pause()
            postStatus("Audio paused by interruption")
        case .ended:
            let rawOptions = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: rawOptions)
            if options.contains(.shouldResume) {
                start()
            } else {
                postStatus("Audio paused — tap a pad to retry")
            }
        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard let rawReason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: rawReason) else { return }

        switch reason {
        case .newDeviceAvailable, .oldDeviceUnavailable, .routeConfigurationChange, .categoryChange:
            postStatus("Audio route changed — recovering")
            start()
        default:
            break
        }
    }

    @objc private func handleMediaServicesReset() {
        engine.reset()
        engine.prepare()
        postStatus("Audio service reset — recovering")
        start()
    }

    private func postStatus(_ message: String) {
        NotificationCenter.default.post(name: .musiCollabAudioStatus, object: self, userInfo: ["message": message])
    }

    func trigger(note: UInt8, velocity: UInt8 = 110) {
        guard !trackMuted, soloTrackID == nil || soloTrackID == "drums" else { return }
        let padIndex = Int(note >= 36 ? note - 36 : note) % 8
        let buffer = drumBuffers[note] ?? makeDrumBuffer(note: note, velocity: velocity)
        drumBuffers[note] = buffer
        let voiceSlot = nextVoiceByPad[padIndex]
        nextVoiceByPad[padIndex] = (voiceSlot + 1) % 2
        let node = drumNodes[(padIndex * 2) + voiceSlot]
        node.stop()
        node.volume = Float(trackVolume)
        node.scheduleBuffer(buffer, at: nil, options: [])
        node.play()
    }

    func setInstrument(_ name: String, pitchSemitones: Int) {
        let selected = ["drums", "bass", "keys", "sampler"].contains(name) ? name : "drums"
        let family = selected == "drums" ? "percussion" : selected == "sampler" ? "sample" : "synth"
        applyInstrument(InstrumentPreset(instrumentID: selected, instrument: selected, name: selected.capitalized, family: family, parameters: [:], pitch: pitchSemitones))
    }

    func applyInstrument(_ value: InstrumentPreset) {
        let selected = ["drums", "bass", "keys", "sampler"].contains(value.instrument) ? value.instrument : "drums"
        let boundedParameters = value.parameters.reduce(into: [String: Double]()) { result, item in
            if item.key == "voiceCount" {
                result[item.key] = min(32, max(1, item.value.rounded()))
            } else if item.value.isFinite {
                result[item.key] = min(1, max(-1, item.value))
            }
        }
        preset = InstrumentPreset(instrumentID: value.instrumentID.isEmpty ? selected : value.instrumentID, instrument: selected, name: value.name.isEmpty ? selected.capitalized : value.name, family: value.family, engine: value.engine, parameters: boundedParameters, pitch: value.pitch)
        drumBuffers.removeAll()
    }

    func setInstrumentParameter(_ name: String, value: Double) {
        guard value.isFinite else { return }
        var updated = preset.parameters
        if name == "voiceCount" {
            updated[name] = min(32, max(1, value.rounded()))
        } else {
            updated[name] = min(1, max(-1, value))
        }
        preset.parameters = updated
        drumBuffers.removeAll()
    }

    func applyTrackControl(_ payload: [String: Any]) {
        let trackID = payload["trackID"] as? String ?? "drums"
        if trackID == "drums", let instrumentID = payload["instrumentID"] as? String {
            setInstrument(instrumentID, pitchSemitones: preset.pitch)
        }
        if let volume = payload["volume"] as? Double, volume.isFinite { trackVolume = max(0, min(1, volume)) }
        if let mute = payload["mute"] as? Bool { trackMuted = mute }
        if let solo = payload["solo"] as? Bool {
            soloTrackID = solo ? trackID : (soloTrackID == trackID ? nil : soloTrackID)
        }
        drumNodes.forEach { $0.volume = Float(trackVolume) }
    }

    func stop(note: UInt8) {
        let padIndex = Int(note >= 36 ? note - 36 : note) % 8
        drumNodes[padIndex * 2].stop()
        drumNodes[(padIndex * 2) + 1].stop()
    }

    private func makeDrumBuffer(note: UInt8, velocity: UInt8) -> AVAudioPCMBuffer {
        let pad = Int(note >= 36 ? note - 36 : note) % 8
        let decay = parameters["decay"] ?? 1.0
        let tone = parameters["tone"] ?? 0.0
        let duration: Double = (pad == 0 ? 0.42 : (pad == 2 ? 0.12 : pad == 5 ? 0.34 : 0.24)) * (0.6 + (decay * 0.4))
        let frameCount = AVAudioFrameCount(format.sampleRate * duration)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount
        let samples = buffer.floatChannelData![0]
        let gain = Float(velocity) / 127.0
        let pitchMultiplier = pow(2.0, Double(pitchSemitones) / 12.0)

        for frame in 0..<Int(frameCount) {
            let t = Double(frame) / format.sampleRate
            let progress = t / duration
            let envelope = Float(pow(max(0, 1 - progress), 0.75 + (decay * 0.75)))
            let sample: Float

            switch pad {
            case 0: // kick
                let frequency = (145 - (105 * progress)) * pitchMultiplier
                let body = sin(Float(2 * Double.pi * frequency * t)) * 0.9
                let click = sin(Float(2 * Double.pi * 1800 * t)) * Float(max(0, 1 - (progress * 18))) * 0.18
                sample = (body + click) * envelope
            case 1: // snare: noise plus a short tuned body
                let noise = Float.random(in: -1...1)
                let body = sin(Float(2 * Double.pi * 190 * pitchMultiplier * t)) * 0.3
                sample = (noise * 0.8 + body) * envelope * 0.7
            case 2: // closed hat: bright metallic partials
                let metallic = [1_920.0, 2_743.0, 3_516.0, 4_831.0].reduce(0.0) {
                    $0 + sin(Float(2 * Double.pi * $1 * t))
                } / 4.0
                sample = (metallic * 0.55 + Float.random(in: -1...1) * 0.45) * envelope * 0.45
            case 3: // clap: several short noise transients
                let transient = (0..<3).reduce(Float.zero) { partial, burst in
                    let offset = Double(burst) * 0.014
                    return partial + (t >= offset ? Float.random(in: -1...1) * Float(max(0, 1 - ((t - offset) * 35))) : 0)
                }
                sample = transient * envelope * 0.42
            case 4: // percussion: pitched wood-like click
                let click = sin(Float(2 * Double.pi * 520 * pitchMultiplier * t))
                sample = (click + Float.random(in: -1...1) * 0.16) * envelope * 0.5
            case 5: // tom: falling pitched tone
                let frequency = (250 - (100 * progress)) * pitchMultiplier
                sample = sin(Float(2 * Double.pi * frequency * t)) * envelope * 0.65
            case 6: // rim: short high click
                let frequency = (1_100 + (tone * 250)) * pitchMultiplier
                sample = sin(Float(2 * Double.pi * frequency * t)) * envelope * 0.5
            default: // FX: noisy pitched accent
                let frequency = (330 + (tone * 180)) * pitchMultiplier
                sample = (sin(Float(2 * Double.pi * frequency * t)) * 0.55 + Float.random(in: -1...1) * 0.25) * envelope * 0.5
            }

            samples[frame] = sample * gain
        }
        return buffer
    }
}
