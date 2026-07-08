import SwiftUI

/// 初回起動時のオンボーディング / チュートリアル。
struct OnboardingView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment
    @State private var page = 0

    private struct Page {
        let emoji: String
        let title: String
        let message: String
    }

    private let pages: [Page] = [
        Page(
            emoji: "🐶🐱🦊",
            title: "あなたは何顔タイプ？",
            message: "顔写真をもとに、たぬき顔・きつね顔など全10種類の動物顔タイプを診断します。"
        ),
        Page(
            emoji: "📸",
            title: "撮るだけカンタン診断",
            message: "カメラで撮影するか、アルバムから写真を選ぶだけ。正面を向いた明るい写真だとうまく診断できます。"
        ),
        Page(
            emoji: "🔒",
            title: "写真は保存されません",
            message: "解析はすべて端末の中で行われ、写真は診断後すぐに破棄されます。安心して楽しんでください！"
        ),
    ]

    var body: some View {
        VStack {
            TabView(selection: $page) {
                ForEach(pages.indices, id: \.self) { index in
                    VStack(spacing: 20) {
                        Text(pages[index].emoji)
                            .font(.system(size: 72))
                        Text(pages[index].title)
                            .font(.title2.bold())
                        Text(pages[index].message)
                            .font(.subheadline)
                            .multilineTextAlignment(.center)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 40)
                    }
                    .tag(index)
                }
            }
            .tabViewStyle(.page)
            .indexViewStyle(.page(backgroundDisplayMode: .always))

            Button {
                if page < pages.count - 1 {
                    withAnimation { page += 1 }
                } else {
                    finish()
                }
            } label: {
                Text(page < pages.count - 1 ? "つぎへ" : "はじめる")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppConfig.Theme.primary)
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 32)

            Button("スキップ") {
                finish()
            }
            .font(.subheadline)
            .foregroundColor(.secondary)
            .padding(.vertical, 12)
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
    }

    private func finish() {
        appState.hasCompletedOnboarding = true
        appState.showOnboarding = false
        environment.analytics.track(.onboardingCompleted)
        appState.path = [.userInfo]
    }
}
