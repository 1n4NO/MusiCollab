import UIKit

final class RootViewController: UIViewController {
    private let audio = AudioEngine()
    private let samples = SampleLibrary()
    private var tempo = 118
    private var isPlaying = false
    private var tempoLabel: UILabel!
    private var connectionLabel: UILabel!
    private var sampleTitleLabel: UILabel!
    private var playButton: UIButton!
    private var padButtons: [UIButton] = []
    private var importedSample: ImportedSample?
    private var sessionTransport: SessionTransport?

    private let bg = UIColor(red: 0.055, green: 0.065, blue: 0.09, alpha: 1)
    private let panel = UIColor(red: 0.10, green: 0.115, blue: 0.15, alpha: 1)
    private let cyan = UIColor(red: 0.28, green: 0.90, blue: 0.95, alpha: 1)
    private let coral = UIColor(red: 1.0, green: 0.34, blue: 0.34, alpha: 1)
    private let violet = UIColor(red: 0.66, green: 0.45, blue: 1.0, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = bg
        buildInterface()
        connectToSessionServer()
        audio.start()
    }

    private func buildInterface() {
        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)
        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        let content = UIStackView()
        content.axis = .vertical
        content.spacing = 14
        content.layoutMargins = UIEdgeInsets(top: 14, left: 16, bottom: 24, right: 16)
        content.isLayoutMarginsRelativeArrangement = true
        content.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(content)
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            content.leadingAnchor.constraint(equalTo: scroll.frameLayoutGuide.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: scroll.frameLayoutGuide.trailingAnchor),
            content.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor)
        ])

        let title = UILabel()
        title.text = "MUSICOLLAB"
        title.textColor = .white
        title.font = UIFont.systemFont(ofSize: 22, weight: .heavy)
        content.addArrangedSubview(title)

        let sub = UILabel()
        sub.text = "Shared session  /  A-side"
        sub.textColor = .lightGray
        sub.font = UIFont.systemFont(ofSize: 13, weight: .medium)
        content.addArrangedSubview(sub)

        let transport = makePanel()
        let transportStack = UIStackView()
        transportStack.axis = .horizontal
        transportStack.alignment = .center
        transportStack.spacing = 12
        transportStack.translatesAutoresizingMaskIntoConstraints = false
        transport.addSubview(transportStack)
        NSLayoutConstraint.activate([
            transportStack.topAnchor.constraint(equalTo: transport.topAnchor, constant: 12),
            transportStack.leadingAnchor.constraint(equalTo: transport.leadingAnchor, constant: 12),
            transportStack.trailingAnchor.constraint(equalTo: transport.trailingAnchor, constant: -12),
            transportStack.bottomAnchor.constraint(equalTo: transport.bottomAnchor, constant: -12)
        ])
        playButton = makeButton(title: "▶", color: coral)
        playButton.addTarget(self, action: #selector(togglePlay), for: .touchUpInside)
        tempoLabel = UILabel()
        tempoLabel.text = "118 BPM"
        tempoLabel.textColor = cyan
        tempoLabel.font = UIFont.monospacedDigitSystemFont(ofSize: 19, weight: .bold)
        let tempoMinus = makeButton(title: "−", color: .white)
        tempoMinus.addTarget(self, action: #selector(changeTempoDown), for: .touchUpInside)
        let tempoPlus = makeButton(title: "+", color: .white)
        tempoPlus.addTarget(self, action: #selector(changeTempoUp), for: .touchUpInside)
        connectionLabel = UILabel()
        connectionLabel.text = "● searching"
        connectionLabel.textColor = .lightGray
        connectionLabel.font = UIFont.systemFont(ofSize: 11, weight: .semibold)
        transportStack.addArrangedSubview(playButton)
        transportStack.addArrangedSubview(tempoMinus)
        transportStack.addArrangedSubview(tempoLabel)
        transportStack.addArrangedSubview(tempoPlus)
        transportStack.addArrangedSubview(UIView())
        transportStack.addArrangedSubview(connectionLabel)
        content.addArrangedSubview(transport)

        let section = makeSectionLabel("DRUM PADS")
        content.addArrangedSubview(section)
        let grid = UIStackView()
        grid.axis = .vertical
        grid.spacing = 8
        for row in 0..<2 {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 8
            for column in 0..<4 {
                let index = row * 4 + column
                let button = makePad(title: ["KICK", "SNARE", "HAT", "CLAP", "PERC", "TOM", "RIM", "FX"][index], color: index == 0 ? coral : panel)
                button.tag = index
                button.addTarget(self, action: #selector(hitPad(_:)), for: .touchDown)
                rowStack.addArrangedSubview(button)
                padButtons.append(button)
            }
            grid.addArrangedSubview(rowStack)
        }
        content.addArrangedSubview(grid)

        content.addArrangedSubview(makeSectionLabel("LOOPS  /  INSTRUMENTS"))
        let loops = makePanel()
        let loopStack = UIStackView()
        loopStack.axis = .vertical
        loopStack.spacing = 7
        ["DRUM KIT", "BASS PULSE", "NIGHT KEYS"].enumerated().forEach { index, name in
            let row = UIStackView()
            row.axis = .horizontal
            row.spacing = 10
            let label = UILabel()
            label.text = name
            label.textColor = .white
            label.font = UIFont.systemFont(ofSize: 14, weight: .semibold)
            let state = UILabel()
            state.text = index == 0 ? "● PLAYING" : "○ READY"
            state.textColor = index == 0 ? coral : .lightGray
            state.font = UIFont.systemFont(ofSize: 11, weight: .bold)
            row.addArrangedSubview(label)
            row.addArrangedSubview(UIView())
            row.addArrangedSubview(state)
            loopStack.addArrangedSubview(row)
        }
        loops.addSubview(loopStack)
        loopStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            loopStack.topAnchor.constraint(equalTo: loops.topAnchor, constant: 12),
            loopStack.leadingAnchor.constraint(equalTo: loops.leadingAnchor, constant: 12),
            loopStack.trailingAnchor.constraint(equalTo: loops.trailingAnchor, constant: -12),
            loopStack.bottomAnchor.constraint(equalTo: loops.bottomAnchor, constant: -12)
        ])
        content.addArrangedSubview(loops)

        content.addArrangedSubview(makeSectionLabel("SAMPLE LAB"))
        let sample = makePanel()
        let sampleStack = UIStackView()
        sampleStack.axis = .vertical
        sampleStack.spacing = 10
        sampleTitleLabel = UILabel()
        sampleTitleLabel.text = "No sample loaded"
        sampleTitleLabel.textColor = .white
        sampleTitleLabel.font = UIFont.systemFont(ofSize: 15, weight: .semibold)
        let importButton = makeButton(title: "IMPORT SAMPLE", color: violet)
        importButton.addTarget(self, action: #selector(importSample), for: .touchUpInside)
        let sliceButton = makeButton(title: "SLICE INTO 8", color: cyan)
        sliceButton.addTarget(self, action: #selector(sliceSample), for: .touchUpInside)
        sampleStack.addArrangedSubview(sampleTitleLabel)
        sampleStack.addArrangedSubview(makeWaveform())
        let actions = UIStackView(arrangedSubviews: [importButton, sliceButton])
        actions.axis = .horizontal
        actions.spacing = 8
        actions.distribution = .fillEqually
        sampleStack.addArrangedSubview(actions)
        sample.addSubview(sampleStack)
        sampleStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            sampleStack.topAnchor.constraint(equalTo: sample.topAnchor, constant: 12),
            sampleStack.leadingAnchor.constraint(equalTo: sample.leadingAnchor, constant: 12),
            sampleStack.trailingAnchor.constraint(equalTo: sample.trailingAnchor, constant: -12),
            sampleStack.bottomAnchor.constraint(equalTo: sample.bottomAnchor, constant: -12)
        ])
        content.addArrangedSubview(sample)
    }

    private func makePanel() -> UIView {
        let panel = UIView()
        panel.backgroundColor = self.panel
        panel.layer.cornerRadius = 14
        panel.layer.borderWidth = 1
        panel.layer.borderColor = UIColor.white.withAlphaComponent(0.08).cgColor
        return panel
    }

    private func makeSectionLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.textColor = .lightGray
        label.font = UIFont.systemFont(ofSize: 11, weight: .bold)
        return label
    }

    private func makeButton(title: String, color: UIColor) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(color, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 14, weight: .bold)
        button.backgroundColor = UIColor.white.withAlphaComponent(0.06)
        button.layer.cornerRadius = 10
        button.heightAnchor.constraint(equalToConstant: 44).isActive = true
        return button
    }

    private func makePad(title: String, color: UIColor) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 12, weight: .bold)
        button.backgroundColor = color
        button.layer.cornerRadius = 12
        button.heightAnchor.constraint(equalToConstant: 74).isActive = true
        return button
    }

    private func makeWaveform() -> UIView {
        let view = WaveformView()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.24)
        view.layer.cornerRadius = 10
        view.heightAnchor.constraint(equalToConstant: 70).isActive = true
        return view
    }

    private func connectToSessionServer() {
        guard #available(iOS 13.0, *),
              let urlString = Bundle.main.object(forInfoDictionaryKey: "MusiCollabServerURL") as? String,
              let url = URL(string: urlString) else { return }
        let transport = SessionWebSocketClient(url: url)
        transport.onConnectionChanged = { [weak self] connected in
            self?.connectionLabel.text = connected ? "● session online" : "● session offline"
            self?.connectionLabel.textColor = connected ? self?.cyan : .lightGray
        }
        transport.onMessage = { [weak self] message in
            guard let self, let eventType = message["eventType"] as? String else { return }
            if eventType == "padHit", let payload = message["payload"] as? [String: Any], let pad = payload["pad"] as? Int {
                self.flashPad(pad)
            }
        }
        sessionTransport = transport
        transport.connect(room: "LOCAL", clientID: "iphone14", name: "iPhone 14", role: "performer")
    }

    @objc private func togglePlay() {
        isPlaying.toggle()
        playButton.setTitle(isPlaying ? "■" : "▶", for: .normal)
        sessionTransport?.send(eventType: "transport", payload: ["playing": isPlaying, "bpm": tempo])
    }

    @objc private func changeTempoDown() { setTempo(max(60, tempo - 1)) }
    @objc private func changeTempoUp() { setTempo(min(180, tempo + 1)) }

    private func setTempo(_ value: Int) {
        tempo = value
        tempoLabel.text = "\(tempo) BPM"
        sessionTransport?.send(eventType: "transport", payload: ["playing": isPlaying, "bpm": tempo])
    }

    @objc private func hitPad(_ sender: UIButton) {
        audio.trigger(note: UInt8(36 + sender.tag))
        flashPad(sender.tag)
        sessionTransport?.send(eventType: "padHit", payload: ["track": "drums", "pad": sender.tag, "velocity": 0.86])
    }

    private func flashPad(_ index: Int) {
        guard padButtons.indices.contains(index) else { return }
        let pad = padButtons[index]
        UIView.animate(withDuration: 0.08, animations: {
            pad.backgroundColor = self.cyan
            pad.transform = CGAffineTransform(scaleX: 0.96, y: 0.96)
        }) { _ in
            UIView.animate(withDuration: 0.16) {
                pad.backgroundColor = index == 0 ? self.coral : self.panel
                pad.transform = .identity
            }
        }
    }

    @objc private func importSample() {
        let picker = UIDocumentPickerViewController(documentTypes: ["public.audio"], in: .import)
        picker.delegate = self
        present(picker, animated: true)
    }

    @objc private func sliceSample() {
        guard let sample = importedSample else {
            sampleTitleLabel.text = "Import a sample first"
            return
        }
        let slices = samples.sliceBoundaries(for: sample, count: 8)
        sampleTitleLabel.text = "\(slices.count) slices ready  /  \(formatDuration(sample.duration))"
    }
}

extension RootViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentAt url: URL) {
        importedSample = samples.importSample(from: url)
        if let sample = importedSample {
            sampleTitleLabel.text = "\(sample.url.lastPathComponent)  /  \(formatDuration(sample.duration))"
        } else {
            sampleTitleLabel.text = "Unsupported audio file"
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        String(format: "%.1fs", duration)
    }
}

private final class WaveformView: UIView {
    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        context.setStrokeColor(UIColor(red: 0.66, green: 0.45, blue: 1.0, alpha: 0.8).cgColor)
        context.setLineWidth(2)
        let mid = rect.midY
        let bars = 36
        for index in 0..<bars {
            let x = rect.minX + CGFloat(index) * rect.width / CGFloat(bars)
            let height = CGFloat((index * 17) % 23 + 8)
            context.move(to: CGPoint(x: x, y: mid - height))
            context.addLine(to: CGPoint(x: x, y: mid + height))
        }
        context.strokePath()
    }
}
