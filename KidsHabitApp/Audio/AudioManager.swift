import AVFoundation
import SwiftUI

/// BGM・SE・音声案内を管理するシングルトン
/// 音声素材未収録のため、案内音声は AVSpeechSynthesizer で暫定実装。
/// Resources/Sounds/ に mp3 を置けば自動的にファイル再生へ切り替わる。
final class AudioManager: NSObject, ObservableObject {
    static let shared = AudioManager()

    @Published var isBGMEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isBGMEnabled, forKey: "isBGMEnabled")
            isBGMEnabled ? resumeBGM() : stopBGM()
        }
    }
    @Published var isSEEnabled: Bool {
        didSet { UserDefaults.standard.set(isSEEnabled, forKey: "isSEEnabled") }
    }

    private var bgmPlayer: AVAudioPlayer?
    private var sePlayers: [AVAudioPlayer] = []
    private let synthesizer = AVSpeechSynthesizer()
    private var currentBGMName: String?

    /// SE名の定義（Resources/Sounds/ 配下のファイル名と対応）
    enum SE: String {
        case tap = "se_tap"
        case dragStart = "se_drag_start"
        case snap = "se_snap"
        case swipe = "se_swipe"
        case gargle = "se_gargle"
        case eat = "se_eat"
        case clear = "se_clear"
        case fanfare = "se_fanfare"
        case special = "se_special"
    }

    private override init() {
        isBGMEnabled = UserDefaults.standard.object(forKey: "isBGMEnabled") as? Bool ?? true
        isSEEnabled = UserDefaults.standard.object(forKey: "isSEEnabled") as? Bool ?? true
        super.init()
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    // MARK: - BGM

    func playBGM(named name: String = "bgm_main") {
        currentBGMName = name
        guard isBGMEnabled,
              let url = Bundle.main.url(forResource: name, withExtension: "mp3") else { return }
        bgmPlayer = try? AVAudioPlayer(contentsOf: url)
        bgmPlayer?.numberOfLoops = -1
        bgmPlayer?.volume = 0.4
        bgmPlayer?.play()
    }

    func stopBGM() { bgmPlayer?.stop() }

    private func resumeBGM() {
        if let name = currentBGMName { playBGM(named: name) }
    }

    // MARK: - SE

    func playSE(_ se: SE) {
        guard isSEEnabled else { return }
        guard let url = Bundle.main.url(forResource: se.rawValue, withExtension: "mp3") else {
            // 素材未同梱のためシステムサウンドで代替
            playFallbackSound(for: se)
            return
        }
        // 同時再生のためプレイヤーを都度生成
        if let player = try? AVAudioPlayer(contentsOf: url) {
            sePlayers.removeAll { !$0.isPlaying }
            sePlayers.append(player)
            player.play()
        }
    }

    private func playFallbackSound(for se: SE) {
        let soundID: SystemSoundID
        switch se {
        case .clear, .fanfare, .special: soundID = 1025
        case .snap, .eat: soundID = 1104
        default: soundID = 1104
        }
        AudioServicesPlaySystemSound(soundID)
    }

    // MARK: - 音声案内（暫定：読み上げ）

    /// 収録音声（voice_<key>.mp3）があればファイル再生、無ければ読み上げ
    func speak(_ text: String, voiceFileName: String? = nil) {
        guard isSEEnabled else { return }
        if let name = voiceFileName,
           let url = Bundle.main.url(forResource: name, withExtension: "mp3"),
           let player = try? AVAudioPlayer(contentsOf: url) {
            sePlayers.removeAll { !$0.isPlaying }
            sePlayers.append(player)
            player.play()
            return
        }
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "ja-JP")
        utterance.rate = 0.45
        utterance.pitchMultiplier = 1.3   // 子ども向けに高めの声
        synthesizer.speak(utterance)
    }
}
