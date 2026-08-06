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

    func sliceBoundaries(for sample: ImportedSample, count: Int = 8) -> [ClosedRange<Double>] {
        guard count > 0 else { return [] }
        let width = sample.duration / Double(count)
        return (0..<count).map {
            let start = Double($0) * width
            return start...(start + width)
        }
    }
}
