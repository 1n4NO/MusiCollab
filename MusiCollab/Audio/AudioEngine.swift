import AVFoundation

final class AudioEngine {
    let engine = AVAudioEngine()
    private var drumNodes: [AVAudioPlayerNode] = []
    private var drumBuffers: [UInt8: AVAudioPCMBuffer] = [:]
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!

    init() {
        for _ in 0..<8 {
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode, format: format)
            drumNodes.append(node)
        }
        engine.prepare()
    }

    func start() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [])
        try? session.setActive(true)
        try? engine.start()
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

        for frame in 0..<Int(frameCount) {
            let t = Double(frame) / format.sampleRate
            let progress = t / duration
            let envelope = Float(max(0, 1 - progress))
            let sample: Float

            switch pad {
            case 0: // kick
                let frequency = 120 - (80 * progress)
                sample = sin(Float(2 * Double.pi * frequency * t)) * envelope * 0.9
            case 1, 3, 4: // snare, clap, percussion
                let noise = Float.random(in: -1...1)
                let tone = sin(Float(2 * Double.pi * 180 * t)) * 0.25
                sample = (noise * 0.72 + tone) * envelope * 0.55
            case 2, 6: // hats and rim
                sample = Float.random(in: -1...1) * envelope * 0.32
            default: // tom and FX
                sample = sin(Float(2 * Double.pi * (180 + Double(pad * 30)) * t)) * envelope * 0.5
            }

            samples[frame] = sample * gain
        }
        return buffer
    }
}
