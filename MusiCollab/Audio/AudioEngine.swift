import AVFoundation

final class AudioEngine {
    let engine = AVAudioEngine()
    private var drumNodes: [AVAudioPlayerNode] = []
    private var drumBuffers: [UInt8: AVAudioPCMBuffer] = [:]
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    private let audioSession = AVAudioSession.sharedInstance()
    private var instrument = "drums"
    private var pitchSemitones = 0
    private var parameters: [String: Double] = [:]

    init() {
        for _ in 0..<8 {
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
            try audioSession.setCategory(.playback, mode: .default, options: [])
            try audioSession.setActive(true)
            if !engine.isRunning {
                try engine.start()
            }
        } catch {
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
        case .ended:
            let rawOptions = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: rawOptions)
            if options.contains(.shouldResume) {
                start()
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
            if !engine.isRunning { start() }
        default:
            break
        }
    }

    @objc private func handleMediaServicesReset() {
        start()
    }

    func trigger(note: UInt8, velocity: UInt8 = 110) {
        let padIndex = Int(note >= 36 ? note - 36 : note) % drumNodes.count
        let buffer = drumBuffers[note] ?? makeDrumBuffer(note: note, velocity: velocity)
        drumBuffers[note] = buffer
        let node = drumNodes[padIndex]
        node.stop()
        node.scheduleBuffer(buffer, at: nil, options: [])
        node.play()
    }

    func setInstrument(_ name: String, pitchSemitones: Int) {
        instrument = ["drums", "bass", "keys", "sampler"].contains(name) ? name : "drums"
        self.pitchSemitones = max(-24, min(24, pitchSemitones))
        parameters = [:]
        drumBuffers.removeAll()
    }

    func setInstrumentParameter(_ name: String, value: Double) {
        guard value.isFinite else { return }
        if name == "voiceCount" {
            parameters[name] = min(32, max(1, value.rounded()))
        } else {
            parameters[name] = min(1, max(-1, value))
        }
        drumBuffers.removeAll()
    }

    func stop(note: UInt8) {
        let padIndex = Int(note >= 36 ? note - 36 : note) % drumNodes.count
        drumNodes[padIndex].stop()
    }

    private func makeDrumBuffer(note: UInt8, velocity: UInt8) -> AVAudioPCMBuffer {
        let pad = Int(note >= 36 ? note - 36 : note) % 8
        let duration: Double = pad == 0 ? 0.42 : (pad == 2 ? 0.12 : 0.24)
        let frameCount = AVAudioFrameCount(format.sampleRate * duration)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount
        let samples = buffer.floatChannelData![0]
        let gain = Float(velocity) / 127.0
        let pitchMultiplier = pow(2.0, Double(pitchSemitones) / 12.0)

        for frame in 0..<Int(frameCount) {
            let t = Double(frame) / format.sampleRate
            let progress = t / duration
            let envelope = Float(max(0, 1 - progress))
            let sample: Float

            switch pad {
            case 0: // kick
                let frequency = (120 - (80 * progress)) * pitchMultiplier
                sample = sin(Float(2 * Double.pi * frequency * t)) * envelope * 0.9
            case 1, 3, 4: // snare, clap, percussion
                let noise = Float.random(in: -1...1)
                let toneBase: Double = instrument == "bass" ? 90 : instrument == "keys" ? 260 : 180
                let tone = sin(Float(2 * Double.pi * toneBase * pitchMultiplier * t)) * 0.25
                sample = (noise * 0.72 + tone) * envelope * 0.55
            case 2, 6: // hats and rim
                sample = Float.random(in: -1...1) * envelope * 0.32
            default: // tom and FX
                sample = sin(Float(2 * Double.pi * (180 + Double(pad * 30)) * pitchMultiplier * t)) * envelope * 0.5
            }

            samples[frame] = sample * gain
        }
        return buffer
    }
}
