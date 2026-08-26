import SpriteKit

/// きがえゲーム（ドラッグ＆ドロップ）
/// キャラが左、右側の服アイテムを体の正しい位置（あたま・うわはんしん・したはんしん・あしもと）へ。
final class DressingScene: BaseGameScene {
    private let sceneIndex: Int

    /// 装着スロット
    private enum BodySlot: String, CaseIterable {
        case head = "あたま"
        case upper = "うわはんしん"
        case lower = "したはんしん"
        case feet = "あしもと"
    }

    private static let outfits: [[(BodySlot, String, SKColor)]] = [
        // ふだんぎ
        [(.head, "ぼうし", .systemRed), (.upper, "しゃつ", .systemBlue), (.lower, "ずぼん", .systemGreen), (.feet, "くつ", .systemOrange)],
        // すーつふう
        [(.head, "はっと", .black), (.upper, "じゃけっと", .systemGray), (.lower, "すらっくす", .darkGray), (.feet, "かわぐつ", .brown)],
        // あめのひ
        [(.head, "れいんはっと", .systemYellow), (.upper, "かっぱ", .systemTeal), (.lower, "れいんずぼん", .systemCyan), (.feet, "ながぐつ", .systemYellow)],
        // なつふく
        [(.head, "むぎわらぼうし", .systemYellow), (.upper, "てぃーしゃつ", .white), (.lower, "はんずぼん", .systemBlue), (.feet, "さんだる", .systemPink)],
    ]

    private var draggingNode: SKSpriteNode?
    private var itemOrigins: [SKSpriteNode: CGPoint] = [:]
    private var slotPositions: [BodySlot: CGPoint] = [:]
    private var remainingItems = 0
    private var characterNode: SKNode?

    private let snapDistance: CGFloat = 110

    init(sceneIndex: Int) {
        self.sceneIndex = sceneIndex
        super.init(size: .zero)
    }

    required init?(coder aDecoder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        super.didMove(to: view)
        setupCharacter()
        setupItems()
        showGuide(text: "おきがえ してみよう！")
    }

    private func setupCharacter() {
        let character = SKNode()
        character.position = CGPoint(x: size.width * 0.28, y: size.height * 0.5)
        addChild(character)
        characterNode = character

        // 体のプレースホルダー（頭・胴・脚・足）
        let head = SKShapeNode(circleOfRadius: 50)
        head.fillColor = SKColor(red: 1.0, green: 0.85, blue: 0.7, alpha: 1)
        head.strokeColor = .clear
        head.position = CGPoint(x: 0, y: 130)
        character.addChild(head)

        let body = SKShapeNode(rectOf: CGSize(width: 100, height: 100), cornerRadius: 20)
        body.fillColor = SKColor(white: 0.9, alpha: 1)
        body.strokeColor = .clear
        body.position = CGPoint(x: 0, y: 30)
        character.addChild(body)

        let legs = SKShapeNode(rectOf: CGSize(width: 80, height: 80), cornerRadius: 16)
        legs.fillColor = SKColor(white: 0.85, alpha: 1)
        legs.strokeColor = .clear
        legs.position = CGPoint(x: 0, y: -60)
        character.addChild(legs)

        // スロット位置（ワールド座標）
        let base = character.position
        slotPositions = [
            .head: CGPoint(x: base.x, y: base.y + 180),
            .upper: CGPoint(x: base.x, y: base.y + 30),
            .lower: CGPoint(x: base.x, y: base.y - 60),
            .feet: CGPoint(x: base.x, y: base.y - 130),
        ]

        // スロットのガイド表示（点線枠）
        for (_, position) in slotPositions {
            let guide = SKShapeNode(circleOfRadius: 22)
            guide.strokeColor = SKColor(white: 0.6, alpha: 0.5)
            guide.lineWidth = 2
            guide.position = position
            addChild(guide)
        }
    }

    private func setupItems() {
        let outfit = Self.outfits[sceneIndex]
        remainingItems = outfit.count

        for (i, (slot, name, color)) in outfit.enumerated() {
            let item = SKSpriteNode(color: color, size: CGSize(width: 90, height: 70))
            item.position = CGPoint(
                x: size.width * 0.62 + CGFloat(i % 2) * 160,
                y: size.height * 0.68 - CGFloat(i / 2) * 140
            )
            item.zPosition = 10
            item.name = "slot_\(slot.rawValue)"
            addChild(item)
            itemOrigins[item] = item.position

            let label = SKLabelNode(text: name)
            label.fontName = "HiraginoSans-W6"
            label.fontSize = 16
            label.fontColor = color == .white ? .darkGray : .white
            label.verticalAlignmentMode = .center
            item.addChild(label)
        }
    }

    // MARK: - タッチ

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !isCleared else { return }
        let location = touch.location(in: self)
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

        guard let slotName = node.name?.replacingOccurrences(of: "slot_", with: ""),
              let slot = BodySlot(rawValue: slotName),
              let target = slotPositions[slot] else { return }

        if node.position.distance(to: target) < snapDistance {
            // パチッとはまる演出
            AudioManager.shared.playSE(.snap)
            itemOrigins.removeValue(forKey: node)
            node.run(.move(to: target, duration: 0.15))
            emitSparkles(at: target, count: 6)

            remainingItems -= 1
            if remainingItems <= 0 { finishDressing() }
        } else {
            returnGently(node, to: itemOrigins[node] ?? node.position)
        }
    }

    private func finishDressing() {
        // キャラがポーズを決める（ズームイン演出）
        characterNode?.run(.sequence([
            .scale(to: 1.25, duration: 0.4),
            .rotate(byAngle: .pi / 16, duration: 0.15),
            .rotate(byAngle: -.pi / 8, duration: 0.3),
            .rotate(byAngle: .pi / 16, duration: 0.15),
        ]))
        performClear(message: "じぶんで きれたね！かっこいい！")
    }
}
