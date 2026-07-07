import SwiftUI
import SpriteKit

/// SwiftUI と SpriteKit の橋渡し。
/// カテゴリ＋シーン番号から対応する SKScene を生成して表示する。
struct GameContainerView: View {
    let category: CategoryType
    let sceneIndex: Int
    let onSceneClear: () -> Void
    let onHome: () -> Void

    @StateObject private var holder = SceneHolder()
    @State private var showClearOverlay = false

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                SpriteView(scene: holder.scene(category: category, sceneIndex: sceneIndex, size: geo.size) {
                    showClearOverlay = true
                })
                .ignoresSafeArea()

                HomeButton(action: onHome)
                    .padding(16)

                if showClearOverlay {
                    SceneClearView { onSceneClear() }
                }
            }
        }
    }
}

/// body再評価でゲームシーンが再生成されないよう、生成済みシーンを保持する
final class SceneHolder: ObservableObject {
    private var cached: BaseGameScene?

    func scene(category: CategoryType, sceneIndex: Int, size: CGSize, onClear: @escaping () -> Void) -> BaseGameScene {
        if let cached { return cached }

        let scene: BaseGameScene
        let sceneData = category.scenes[sceneIndex]
        switch category {
        case .toothBrushing:
            scene = ToothBrushingScene(sceneIndex: sceneIndex, isGargle: sceneData.gameType == .gargle)
        case .cleanup:
            scene = CleanupScene(sceneIndex: sceneIndex)
        case .meal:
            scene = MealScene(setIndex: sceneIndex)
        case .dressing:
            scene = DressingScene(sceneIndex: sceneIndex)
        default:
            scene = BaseGameScene()
        }
        scene.size = size == .zero ? CGSize(width: 844, height: 390) : size
        scene.onClear = onClear
        cached = scene
        return scene
    }
}
