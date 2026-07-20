import SwiftUI

/// 画面5: 診断中ローディング。
/// 解析完了と同時に画像を必ず破棄する（成功・失敗どちらでも）。
struct LoadingView: View {
    let item: DiagnosisItem

    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment
    @EnvironmentObject private var entitlements: EntitlementManager

    @State private var errorMessage: String?
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 24) {
            if let errorMessage {
                Text("😢")
                    .font(.system(size: 56))
                Text(errorMessage)
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 32)
                Button {
                    appState.path.removeLast() // 撮影画面へ戻る
                } label: {
                    Text("もう一度写真を選ぶ")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppConfig.Theme.primary)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                }
                .padding(.horizontal, 32)
            } else {
                Text("🔍")
                    .font(.system(size: 64))
                    .rotationEffect(.degrees(isAnimating ? 12 : -12))
                    .animation(
                        .easeInOut(duration: 0.5).repeatForever(autoreverses: true),
                        value: isAnimating
                    )
                Text("あなたのお顔を分析中…")
                    .font(.headline)
                Text("解析は端末の中だけで行われます")
                    .font(.caption)
                    .foregroundColor(.secondary)
                ProgressView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .onAppear { isAnimating = true }
        .task {
            await runDiagnosis()
        }
    }

    private func runDiagnosis() async {
        guard errorMessage == nil else { return }
        guard let image = appState.pendingImage else {
            errorMessage = AppConfig.ErrorText.imageLoadFailed
            return
        }
        guard let service = environment.diagnosisService else {
            appState.pendingImage = nil
            errorMessage = DiagnosisError.contentUnavailable.localizedDescription
            return
        }

        do {
            let result = try await service.diagnose(item: item, image: image)
            // プライバシー要件: 診断が終わった瞬間に画像を破棄する
            appState.pendingImage = nil
            // 演出用の最低表示時間（結果自体は決定論的で待ち時間に依存しない）
            try? await Task.sleep(nanoseconds: 1_000_000_000)

            appState.lastResult = result
            environment.analytics.track(.diagnosisCompleted(itemID: item.id))

            // 無料ユーザーの2回目以降はインタースティシャル選択画面を挟む
            let isSecondOrLater =
                appState.completedDiagnosisCount + 1 >= AppConfig.Ads.interstitialFromDiagnosisCount
            appState.completedDiagnosisCount += 1
            let needsAdGate = !entitlements.isPremium && isSecondOrLater
            appState.showDiagnosisOutcome(needsAdGate: needsAdGate)
        } catch {
            // 失敗時も必ず画像を破棄し、フレンドリーに再撮影へ誘導する
            appState.pendingImage = nil
            try? await Task.sleep(nanoseconds: 600_000_000)
            environment.analytics.track(.diagnosisFailed(itemID: item.id, reason: "\(error)"))
            errorMessage = (error as? LocalizedError)?.errorDescription
                ?? AppConfig.ErrorText.faceNotFound
        }
    }
}
