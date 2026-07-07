import SpriteKit

/// はみがきゲーム（スワイプ・なぞる方式）
/// 汚れノードを小さなパッチの集合で表現し、なぞった割合（80%以上）でクリア判定する。
/// 最終シーンはうがい（コップをドラッグ→往復なぞり）。
final class ToothBrushingScene: BaseGameScene {
    private let sceneIndex: Int
    private let isGargle: Bool

    // 汚れパッチ（消えた割合でクリア判定）
    private var dirtPatches: [SKShapeNode] = []
    private var totalDirtCount = 0
    private var brushNode: SKSpriteNode?

    // うがい用
    private var cupNode: SKShapeNode?
    private var cupAtMouth = false
    private var gargleStrokes = 0
    private var lastGargleX: CGFloat = 0
    private var lastGargleDirection: CGFloat = 0

    /// 2歳児対応：ヒット判定を大きめに（指2本分以上）
    private let hitRadius: CGFloat = 60

    init(sceneIndex: Int, isGargle: Bool) {
        self.sceneIndex = sceneIndex
        self.isGargle = isGargle
        super.init(size: .zero)
    }

    required init?(coder aDecoder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        super.didMove(to: view)
        if isGargle {
            setupGargle()
            showGuide(text: "うがいを してみよう！")
        } else {
            setupTeeth()
            showGuide(text: "はを みがいてみよう！")
        }
    }

    // MARK: - 歯みがきセットアップ

    private func setupTeeth() {
        // 口（背景）：ズームアップした歯の表現（プレースホルダー図形）
        let mouth = SKShapeNode(rectOf: CGSize(width: size.width * 0.75, height: size.height * 0.55), cornerRadius: 60)
        mouth.fillColor = SKColor(red: 0.95, green: 0.6, blue: 0.6, alpha: 1)
        mouth.strokeColor = .clear
        mouth.position = CGPoint(x: size.width / 2, y: size.height / 2)
        addChild(mouth)

        // 歯を並べる（上段 or 下段はシーンにより表現差のみ）
        let teethY = size.height / 2 + (sceneIndex < 2 ? -40 : 40)
        for i in 0..<6 {
            let tooth = SKShapeNode(rectOf: CGSize(width: 70, height: 90), cornerRadius: 20)
            tooth.fillColor = SKColor(white: 0.95, alpha: 1)
            tooth.strokeColor = SKColor(white: 0.8, alpha: 1)
            tooth.lineWidth = 2
            tooth.position = CGPoint(x: size.width / 2 + CGFloat(i - 3) * 80 + 40, y: teethY)
            addChild(tooth)
        }

        // 汚れパッチ：歯の上にランダム配置（消した割合で判定するパーセンテージ方式）
        totalDirtCount = 30
        for _ in 0..<totalDirtCount {
            let dirt = SKShapeNode(circleOfRadius: CGFloat.random(in: 10...18))
            dirt.fillColor = SKColor(red: 0.75, green: 0.7, blue: 0.4, alpha: 0.85)
            dirt.strokeColor = .clear
            dirt.position = CGPoint(
                x: size.width / 2 + CGFloat.random(in: -230...230),
                y: teethY + CGFloat.random(in: -45...45)
            )
            dirt.zPosition = 10
            addChild(dirt)
            dirtPatches.append(dirt)
        }

        // 歯ブラシ（指に追従）
        let brush = SKSpriteNode(color: SKColor(red: 0.35, green: 0.65, blue: 0.95, alpha: 1), size: CGSize(width: 30, height: 120))
        brush.zPosition = 50
        brush.zRotation = .pi / 6
        brush.position = CGPoint(x: size.width * 0.8, y: size.height * 0.25)
        let head = SKSpriteNode(color: .white, size: CGSize(width: 34, height: 40))
        head.position = CGPoint(x: 0, y: 55)
        brush.addChild(head)
        addChild(brush)
        brushNode = brush
    }

    // MARK: - うがいセットアップ

    private func setupGargle() {
        // 顔（口元）
        let face = SKShapeNode(circleOfRadius: 130)
        face.fillColor = SKColor(red: 1.0, green: 0.85, blue: 0.7, alpha: 1)
        face.strokeColor = .clear
        face.position = CGPoint(x: size.width / 2, y: size.height * 0.6)
        face.name = "mouth"
        addChild(face)

        let mouth = SKShapeNode(ellipseOf: CGSize(width: 70, height: 40))
        mouth.fillColor = SKColor(red: 0.85, green: 0.4, blue: 0.4, alpha: 1)
        mouth.strokeColor = .clear
        mouth.position = CGPoint(x: 0, y: -50)
        face.addChild(mouth)

        // コップ（口元へドラッグする）
        let cup = SKShapeNode(rectOf: CGSize(width: 90, height: 110), cornerRadius: 14)
        cup.fillColor = SKColor(red: 0.4, green: 0.8, blue: 0.5, alpha: 1)
        cup.strokeColor = .clear
        cup.position = CGPoint(x: size.width * 0.8, y: size.height * 0.25)
        cup.zPosition = 20
        cup.name = "cup"
        addChild(cup)
        cupNode = cup
    }

    // MARK: - タッチ処理

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !isCleared else { return }
        let location = touch.location(in: self)

        if isGargle {
            handleGargleTouch(location)
        } else {
            handleBrushTouch(location)
        }
    }

    private var lastSwipeSETime: TimeInterval = 0

    private func handleBrushTouch(_ location: CGPoint) {
        brushNode?.position = location

        // シャカシャカSE（連続再生を間引く）
        let now = CACurrentMediaTime()
        if now - lastSwipeSETime > 0.25 {
            AudioManager.shared.playSE(.swipe)
            lastSwipeSETime = now
        }

        // 大きめのヒット判定で汚れを消す
        for dirt in dirtPatches where dirt.parent != nil {
            if hypot(dirt.position.x - location.x, dirt.position.y - location.y) < hitRadius {
                dirt.run(.sequence([.fadeOut(withDuration: 0.15), .removeFromParent()]))
                emitSparkles(at: dirt.position, count: 3)
            }
        }

        // 80%以上落ちたらクリア
        let removed = dirtPatches.filter { $0.parent == nil || $0.alpha < 1 }.count
        if Double(removed) / Double(totalDirtCount) >= 0.8 {
            dirtPatches.forEach { $0.removeFromParent() }
            performClear(message: "ぴかぴかに なったね！")
        }
    }

    private func handleGargleTouch(_ location: CGPoint) {
        guard let cup = cupNode else { return }

        if !cupAtMouth {
            // コップをドラッグして口元へ
            cup.position = location
            if let mouth = childNode(withName: "mouth"),
               hypot(mouth.position.x - location.x, (mouth.position.y - 50) - location.y) < 120 {
                cupAtMouth = true
                cup.run(.move(to: CGPoint(x: mouth.position.x, y: mouth.position.y - 60), duration: 0.2))
                AudioManager.shared.playSE(.snap)
                showGuide(text: "よこに なぞって がらがら！")
            }
        } else {
            // 往復なぞり判定（方向転換をカウント）
            let dx = location.x - lastGargleX
            if abs(dx) > 8 {
                let direction: CGFloat = dx > 0 ? 1 : -1
                if direction != lastGargleDirection && lastGargleDirection != 0 {
                    gargleStrokes += 1
                    AudioManager.shared.playSE(.gargle)
                }
                lastGargleDirection = direction
                lastGargleX = location.x
            }
            if gargleStrokes >= 6 {
                performClear(message: "のども すっきり！")
            }
        }
    }
}
