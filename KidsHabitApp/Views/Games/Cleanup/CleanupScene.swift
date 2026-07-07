import SpriteKit

/// かたづけゲーム（ドラッグ＆ドロップ・スナップ判定あり）
/// 散らかったアイテムを収納場所へ運ぶ。げんかん（index 3）は靴のペア合わせ。
final class CleanupScene: BaseGameScene {
    private let sceneIndex: Int

    private var draggingNode: SKSpriteNode?
    private var itemOrigins: [SKSpriteNode: CGPoint] = [:]
    private var remainingItems = 0

    /// スナップ判定距離（2歳児対応で大きめ）
    private let snapDistance: CGFloat = 100

    init(sceneIndex: Int) {
        self.sceneIndex = sceneIndex
        super.init(size: .zero)
    }

    required init?(coder aDecoder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        super.didMove(to: view)
        sceneIndex == 3 ? setupShoePairing() : setupCleanup()
        showGuide(text: "おかたづけ してみよう！")
    }

    // MARK: - 通常の片付け（りびんぐ・べっど・つくえ）

    private func setupCleanup() {
        // 収納ボックス（右側）
        let box = SKSpriteNode(color: SKColor(red: 0.7, green: 0.5, blue: 0.3, alpha: 1),
                               size: CGSize(width: 200, height: 150))
        box.position = CGPoint(x: size.width * 0.82, y: size.height * 0.3)
        box.name = "storage"
        addChild(box)

        let label = SKLabelNode(text: "はこ")
        label.fontName = "HiraginoSans-W7"
        label.fontSize = 24
        label.fontColor = .white
        label.verticalAlignmentMode = .center
        box.addChild(label)

        // 散らかったアイテム（色ブロックのプレースホルダー）
        let colors: [SKColor] = [.systemRed, .systemBlue, .systemGreen, .systemOrange, .systemPurple]
        remainingItems = 5
        for i in 0..<5 {
            let item = SKSpriteNode(color: colors[i], size: CGSize(width: 80, height: 80))
            item.position = CGPoint(
                x: size.width * CGFloat.random(in: 0.15...0.55),
                y: size.height * CGFloat.random(in: 0.2...0.75)
            )
            item.name = "item"
            item.zPosition = 10
            addChild(item)
            itemOrigins[item] = item.position
        }
    }

    // MARK: - げんかん：靴のペア合わせ

    private var shoeTargets: [String: SKSpriteNode] = [:]

    private func setupShoePairing() {
        let colors: [(String, SKColor)] = [("あか", .systemRed), ("あお", .systemBlue), ("きいろ", .systemYellow)]
        remainingItems = 3

        for (i, (name, color)) in colors.enumerated() {
            // 片方の靴（固定・ターゲット）
            let target = SKSpriteNode(color: color.withAlphaComponent(0.4), size: CGSize(width: 70, height: 100))
            target.position = CGPoint(x: size.width * 0.65 + CGFloat(i) * 110, y: size.height * 0.3)
            target.name = "target_\(name)"
            addChild(target)
            shoeTargets[name] = target

            // もう片方（ドラッグする）
            let shoe = SKSpriteNode(color: color, size: CGSize(width: 70, height: 100))
            shoe.position = CGPoint(x: size.width * 0.15 + CGFloat(i) * 100,
                                    y: size.height * CGFloat.random(in: 0.5...0.75))
            shoe.name = "shoe_\(name)"
            shoe.zPosition = 10
            addChild(shoe)
            itemOrigins[shoe] = shoe.position
        }
    }

    // MARK: - ドラッグ＆ドロップ

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !isCleared else { return }
        let location = touch.location(in: self)
        // 大きめのヒット判定：最も近いドラッグ可能ノードを拾う
        let candidates = itemOrigins.keys.filter { $0.parent != nil }
        if let nearest = candidates.min(by: { $0.position.distance(to: location) < $1.position.distance(to: location) }),
           nearest.position.distance(to: location) < 90 {
            draggingNode = nearest
            nearest.zPosition = 50
            AudioManager.shared.playSE(.dragStart)
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let node = draggingNode else { return }
        node.position = touch.location(in: self)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let node = draggingNode else { return }
        draggingNode = nil
        node.zPosition = 10

        if sceneIndex == 3 {
            handleShoeDropped(node)
        } else {
            handleItemDropped(node)
        }
    }

    private func handleItemDropped(_ node: SKSpriteNode) {
        guard let storage = childNode(withName: "storage") else { return }
        if node.position.distance(to: storage.position) < snapDistance + 80 {
            snapIn(node, at: storage.position)
        } else {
            // 誤ドラッグは優しく元の位置へ
            returnGently(node, to: itemOrigins[node] ?? node.position)
        }
    }

    private func handleShoeDropped(_ node: SKSpriteNode) {
        guard let name = node.name?.replacingOccurrences(of: "shoe_", with: ""),
              let target = shoeTargets[name] else { return }
        if node.position.distance(to: target.position) < snapDistance {
            snapIn(node, at: CGPoint(x: target.position.x + 40, y: target.position.y))
        } else {
            returnGently(node, to: itemOrigins[node] ?? node.position)
        }
    }

    private func snapIn(_ node: SKSpriteNode, at position: CGPoint) {
        AudioManager.shared.playSE(.snap)
        itemOrigins.removeValue(forKey: node)
        node.run(.sequence([
            .move(to: position, duration: 0.15),
            .scale(to: 0.7, duration: 0.15),
        ]))
        emitSparkles(at: position, count: 6)

        remainingItems -= 1
        if remainingItems <= 0 {
            performClear(message: "おへや ぴかぴか！")
        }
    }
}

extension CGPoint {
    func distance(to point: CGPoint) -> CGFloat {
        hypot(x - point.x, y - point.y)
    }
}
