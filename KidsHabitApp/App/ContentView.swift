import SwiftUI

/// アプリ全体のナビゲーション状態
enum AppScreen: Equatable {
    case splash
    case home
    case categoryTop(CategoryType)
    case game(CategoryType, sceneIndex: Int)
    case categoryClear(CategoryType)
}

/// セッション中のみ保持する進捗（永続化しない仕様）
final class SessionProgress: ObservableObject {
    @Published var clearedScenes: [CategoryType: Set<Int>] = [:]

    func isCleared(_ category: CategoryType, index: Int) -> Bool {
        clearedScenes[category]?.contains(index) ?? false
    }

    func markCleared(_ category: CategoryType, index: Int) {
        clearedScenes[category, default: []].insert(index)
    }

    func isCategoryComplete(_ category: CategoryType) -> Bool {
        (clearedScenes[category]?.count ?? 0) >= category.scenes.count
    }
}

struct ContentView: View {
    @State private var screen: AppScreen = .splash
    @StateObject private var progress = SessionProgress()

    var body: some View {
        ZStack {
            AppColor.background.ignoresSafeArea()

            switch screen {
            case .splash:
                SplashView { withAnimation { screen = .home } }
            case .home:
                HomeView { category in
                    withAnimation { screen = .categoryTop(category) }
                }
            case .categoryTop(let category):
                CategoryTopView(
                    category: category,
                    onSelectScene: { index in
                        withAnimation { screen = .game(category, sceneIndex: index) }
                    },
                    onHome: { withAnimation { screen = .home } }
                )
            case .game(let category, let sceneIndex):
                GameContainerView(
                    category: category,
                    sceneIndex: sceneIndex,
                    onSceneClear: {
                        progress.markCleared(category, index: sceneIndex)
                        if progress.isCategoryComplete(category) {
                            withAnimation { screen = .categoryClear(category) }
                        } else {
                            withAnimation { screen = .categoryTop(category) }
                        }
                    },
                    onHome: { withAnimation { screen = .home } }
                )
            case .categoryClear(let category):
                CategoryClearView(
                    category: category,
                    onReplay: {
                        progress.clearedScenes[category] = []
                        withAnimation { screen = .categoryTop(category) }
                    },
                    onHome: { withAnimation { screen = .home } }
                )
            }
        }
        .environmentObject(progress)
    }
}

/// 共通カラーパレット
enum AppColor {
    static let background = Color(red: 1.0, green: 0.97, blue: 0.90)   // パステルクリーム
    static let mainBlue = Color(red: 0.35, green: 0.65, blue: 0.95)
    static let mainYellow = Color(red: 1.0, green: 0.82, blue: 0.25)
    static let mainPink = Color(red: 0.98, green: 0.55, blue: 0.70)
    static let mainGreen = Color(red: 0.40, green: 0.80, blue: 0.50)
    static let accent = Color(red: 1.0, green: 0.45, blue: 0.30)
}
