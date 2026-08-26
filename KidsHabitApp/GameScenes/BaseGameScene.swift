import SpriteKit

/// 全ゲームシーン共通の基底クラス
/// - クリア時のキラキラパーティクル（.sks不要のプログラム生成）
/// - 案内テキスト＋音声の自動再生
/// - クリアコールバック
class BaseGameScene: SKScene {
    /// シーンクリア時に GameContainerView へ通知
    var onClear: (() -> Void)?

    private(set) var isCleared = false

    override func didMove(to view: SKView) {
        backgroundColor = SKColor(red: 1.0, green: 0.97, blue: 0.90, alpha: 1.0)
        scaleMode = .resizeFill
    }

    // MARK: - 案内

    /// シーン開始時の案内（テキスト表示＋音声読み上げ）
    func showGuide(text: String) {
        AudioManager.shared.speak(text)

        let label = SKLabelNode(text: text)
        label.fontName = "HiraginoSans-W7"
        label.fontSize = 30
        label.fontColor = SKColor(red: 1.0, green: 0.45, blue: 0.30, alpha: 1.0)
        label.position = CGPoint(x: size.width / 2, y: size.height - 60)
        label.zPosition = 100
        label.name = "guideLabel"
        addChild(label)

        label.run(.sequence([.wait(forDuration: 3.5), .fadeOut(withDuration: 0.5), .removeFromParent()]))
    }

    // MARK: - クリア処理

    /// クリア演出（キラキラ＋SE）後にコールバック
    func performClear(message: String? = nil) {
        guard !isCleared else { return }
        isCleared = true
        isUserInteractionEnabled = false

        AudioManager.shared.playSE(.clear)
        if let message { AudioManager.shared.speak(message) }

        emitSparkles(at: CGPoint(x: size.width / 2, y: size.height / 2))

        run(.sequence([
            .wait(forDuration: 1.5),
            .run { [weak self] in self?.onClear?() }
        ]))
    }

    /// キラキラパーティクル（StarEffect.sks の代替をコードで生成）
    func emitSparkles(at position: CGPoint, count: Int = 24) {
        let emitter = SKEmitterNode()
        emitter.particleTexture = Self.starTexture
        emitter.numParticlesToEmit = count
        emitter.particleBirthRate = 120
        emitter.particleLifetime = 1.2
        emitter.particleSpeed = 180
        emitter.particleSpeedRange = 80
        emitter.emissionAngleRange = .pi * 2
        emitter.particleScale = 0.5
        emitter.particleScaleRange = 0.3
        emitter.particleScaleSpeed = -0.4
        emitter.particleAlphaSpeed = -0.8
        emitter.particleColor = .yellow
        emitter.particleColorBlendFactor = 1.0
        emitter.position = position
        emitter.zPosition = 200
        addChild(emitter)
        emitter.run(.sequence([.wait(forDuration: 2.0), .removeFromParent()]))
    }

    /// 星形テクスチャ（画像アセット不要）
    static let starTexture: SKTexture = {
        let size = CGSize(width: 32, height: 32)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { ctx in
            let path = UIBezierPath()
            let center = CGPoint(x: 16, y: 16)
            for i in 0..<10 {
                let angle = CGFloat(i) * .pi / 5 - .pi / 2
                let radius: CGFloat = i % 2 == 0 ? 15 : 6
                let point = CGPoint(x: center.x + cos(angle) * radius, y: center.y + sin(angle) * radius)
                i == 0 ? path.move(to: point) : path.addLine(to: point)
            }
            path.close()
            UIColor.white.setFill()
            path.fill()
        }
        return SKTexture(image: image)
    }()

    // MARK: - 共通ユーティリティ

    /// 誤ドラッグ時に元の位置へ優しく戻す（ease-in-out 0.3秒）
    func returnGently(_ node: SKNode, to position: CGPoint) {
        let move = SKAction.move(to: position, duration: 0.3)
        move.timingMode = .easeInEaseOut
        node.run(move)
    }
}
