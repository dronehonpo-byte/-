import SpriteKit

/// しょくじゲーム（タップ＆ドラッグで食材を口元へ運ぶ）
final class MealScene: BaseGameScene {
    private let setIndex: Int

    private static let foodSets: [[String]] = [
        ["ブロッコリー", "ニンジン", "ハンバーグ", "コーン"],
        ["パンケーキ", "キウイ", "バナナ", "イチゴ"],
        ["トマト", "サケ", "レタス", "さつまいも"],
        ["レンコン", "コロッケ", "からあげ", "たまご"],
    ]
    private static let foodColors: [[SKColor]] = [
        [.systemGreen, .systemOrange, .brown, .systemYellow],
        [.systemBrown, .systemGreen, .systemYellow, .systemRed],
        [.systemRed, .systemPink, .systemGreen, .systemPurple],
        [.white, .systemBrown, .systemOrange, .systemYellow],
    ]

    private var draggingNode: SKNode?
    private var foodOrigins: [SKNode: CGPoint] = [:]
    private var remainingFoods = 0
    private var mouthNode: SKShapeNode?

    init(setIndex: Int) {
        self.setIndex = setIndex
        super.init(size: .zero)
    }

    required init?(coder aDecoder: NSCoder) { fatalError() }

    override func didMove(to view: SKView) {
        super.didMove(to: view)
        setupCharacter()
        setupFoods()
        showGuide(text: "ごはんを たべさせてあげよう！")
    }

    private func setupCharacter() {
        // おとこのこキャラ（プレースホルダー：円の顔）
        let face = SKShapeNode(circleOfRadius: 90)
        face.fillColor = SKColor(red: 1.0, green: 0.85, blue: 0.7, alpha: 1)
        face.strokeColor = .clear
        face.position = CGPoint(x: size.width * 0.3, y: size.height * 0.6)
        addChild(face)

        for dx in [-30.0, 30.0] {
            let eye = SKShapeNode(circleOfRadius: 8)
            eye.fillColor = .black
            eye.position = CGPoint(x: dx, y: 20)
            face.addChild(eye)
        }

        // 口（食材を運ぶターゲット）
        let mouth = SKShapeNode(ellipseOf: CGSize(width: 50, height: 26))
        mouth.fillColor = SKColor(red: 0.85, green: 0.4, blue: 0.4, alpha: 1)
        mouth.strokeColor = .clear
        mouth.position = CGPoint(x: 0, y: -40)
        face.addChild(mouth)
        mouthNode = mouth

        // おさら
        let plate = SKShapeNode(ellipseOf: CGSize(width: 340, height: 90))
        plate.fillColor = .white
        plate.strokeColor = SKColor(white: 0.8, alpha: 1)
        plate.lineWidth = 3
        plate.position = CGPoint(x: size.width * 0.65, y: size.height * 0.22)
        addChild(plate)
    }

    private func setupFoods() {
        let names = Self.foodSets[setIndex]
        let colors = Self.foodColors[setIndex]
        remainingFoods = names.count

        for (i, name) in names.enumerated() {
            let food = SKShapeNode(circleOfRadius: 42)
            food.fillColor = colors[i]
            food.strokeColor = SKColor(white: 1, alpha: 0.6)
            food.lineWidth = 3
            food.position = CGPoint(x: size.width * 0.45 + CGFloat(i) * 105, y: size.height * 0.28)
            food.zPosition = 10
            food.name = "food"
            addChild(food)
            foodOrigins[food] = food.position

            let label = SKLabelNode(text: name)
            label.fontName = "HiraginoSans-W6"
            label.fontSize = 14
            label.fontColor = .white
            label.verticalAlignmentMode = .center
            food.addChild(label)
        }
    }

    // MARK: - タッチ

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !isCleared else { return }
        let location = touch.location(in: self)
        let candidates = foodOrigins.keys.filter { $0.parent != nil }
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

        // 口元に近づいたら口を開ける
        if let mouth = mouthNode {
            let mouthWorld = mouth.parent!.convert(mouth.position, to: self)
            let isNear = node.position.distance(to: mouthWorld) < 140
            mouth.yScale = isNear ? 2.0 : 1.0
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let node = draggingNode else { return }
        draggingNode = nil
        node.zPosition = 10

        guard let mouth = mouthNode else { return }
        let mouthWorld = mouth.parent!.convert(mouth.position, to: self)

        if node.position.distance(to: mouthWorld) < 120 {
            eat(node, at: mouthWorld)
        } else {
            returnGently(node, to: foodOrigins[node] ?? node.position)
        }
    }

    private func eat(_ node: SKNode, at mouthPosition: CGPoint) {
        AudioManager.shared.playSE(.eat)
        foodOrigins.removeValue(forKey: node)

        // パクッと食べるアニメーション
        node.run(.sequence([
            .group([.move(to: mouthPosition, duration: 0.2), .scale(to: 0.1, duration: 0.25)]),
            .removeFromParent(),
        ]))

        // もぐもぐ（口の開閉）
        mouthNode?.run(.sequence([
            .scaleY(to: 2.2, duration: 0.12), .scaleY(to: 0.6, duration: 0.12),
            .scaleY(to: 1.6, duration: 0.12), .scaleY(to: 1.0, duration: 0.12),
        ]))

        remainingFoods -= 1
        if remainingFoods <= 0 {
            showGuide(text: "ごちそうさまでした！")
            performClear(message: "ぜんぶ たべれて えらい！")
        }
    }
}
