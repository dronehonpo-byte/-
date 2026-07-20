import SwiftUI

/// 画面1: スプラッシュ / トップ。診断開始ボタン＋アプリ説明。
struct SplashView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // TODO(Miyabee): ロゴ・アイコン素材提供後に差し替え
            Text("🐾")
                .font(.system(size: 88))

            Text(AppConfig.appName)
                .font(.largeTitle.bold())
                .foregroundColor(AppConfig.Theme.primary)

            Text("顔写真から、あなたの\"動物顔タイプ\"を診断！\n写真は端末の中だけで解析され、診断後すぐに破棄されます。")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal, 32)

            Spacer()

            Button {
                if appState.hasCompletedOnboarding {
                    appState.goToMenu()
                } else {
                    appState.showOnboarding = true
                }
            } label: {
                Text("診断をはじめる")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppConfig.Theme.primary)
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 32)

            Button {
                appState.path.append(.settings)
            } label: {
                Text("設定")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}
