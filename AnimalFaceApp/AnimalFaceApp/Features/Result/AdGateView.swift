import SwiftUI

/// 画面7: 結果表示前の広告ゲート（無料ユーザーの2回目以降）。
/// 「広告を見て結果を見る」/「有料プランで広告なし」の2択。
/// 広告の読み込み・表示に失敗しても必ず結果へ進む（診断を止めない）。
struct AdGateView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment
    @EnvironmentObject private var entitlements: EntitlementManager
    @EnvironmentObject private var ads: AdsCoordinator

    @State private var isShowingAd = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Text("🎉")
                .font(.system(size: 64))
            Text("診断結果の準備ができました！")
                .font(.title3.bold())

            Spacer()

            VStack(spacing: 12) {
                Button {
                    guard !isShowingAd else { return }
                    isShowingAd = true
                    ads.showInterstitial {
                        appState.showResult()
                    }
                } label: {
                    Label(isShowingAd ? "広告を準備中…" : "広告を見て結果を見る",
                          systemImage: "play.rectangle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppConfig.Theme.primary)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                }
                .disabled(isShowingAd)

                Button {
                    environment.analytics.track(.paywallShown(source: "ad_skip"))
                    appState.path.append(.paywall(.adSkip))
                } label: {
                    Label("有料プランで広告なしで見る", systemImage: "sparkles")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppConfig.Theme.secondary.opacity(0.3))
                        .foregroundColor(.primary)
                        .cornerRadius(16)
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .onAppear {
            // Paywall から購入して戻ってきた場合などは広告なしで直接結果へ
            if entitlements.isPremium {
                appState.showResult()
            }
        }
    }
}
