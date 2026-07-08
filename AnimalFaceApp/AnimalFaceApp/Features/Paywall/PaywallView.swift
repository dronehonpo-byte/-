import SwiftUI
import StoreKit

/// 画面8: 課金案内（Paywall）。
/// ダークパターン禁止: 閉じる導線は常に明示し、価格・自動更新条件を明記する。
struct PaywallView: View {
    let source: PaywallSource

    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment
    @EnvironmentObject private var entitlements: EntitlementManager
    @EnvironmentObject private var ads: AdsCoordinator

    @State private var isPurchasing = false
    @State private var message: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("✨")
                    .font(.system(size: 56))
                    .padding(.top, 24)

                Text("プレミアムプラン")
                    .font(.title2.bold())

                VStack(alignment: .leading, spacing: 12) {
                    benefitRow("🔓", "有料診断4種類がぜんぶ解放")
                    benefitRow("🚫", "広告が完全に非表示に")
                    benefitRow("♾️", "診断回数は無制限")
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.06), radius: 6, y: 2)
                .padding(.horizontal, 24)

                if entitlements.isPremium {
                    Text("プレミアムプランをご利用中です🎉")
                        .font(.headline)
                        .foregroundColor(AppConfig.Theme.primary)
                    Button("診断にもどる") { continueAfterPurchase() }
                        .buttonStyle(.borderedProminent)
                } else if let product = entitlements.products.first {
                    purchaseSection(product)
                } else {
                    // 商品情報の取得失敗（オフライン等）でも閉じられる・再試行できる
                    VStack(spacing: 12) {
                        Text(AppConfig.ErrorText.productLoadFailed)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        Button {
                            Task { await entitlements.loadProducts() }
                        } label: {
                            if entitlements.isLoadingProducts {
                                ProgressView()
                            } else {
                                Text("再読み込み")
                            }
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.horizontal, 24)
                }

                if let message {
                    Text(message)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                VStack(spacing: 8) {
                    Button("購入を復元する") {
                        Task { await restore() }
                    }
                    .font(.subheadline)

                    HStack(spacing: 16) {
                        Button("利用規約") { appState.path.append(.legal(.terms)) }
                        Button("プライバシーポリシー") { appState.path.append(.legal(.privacy)) }
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)

                    Text("サブスクリプションは期間終了の24時間前までに解約しない限り自動更新されます。解約は App Store のアカウント設定からいつでも行えます。")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
                .padding(.bottom, 24)
            }
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationTitle("プレミアム")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if entitlements.products.isEmpty {
                await entitlements.loadProducts()
            }
        }
    }

    private func benefitRow(_ emoji: String, _ text: String) -> some View {
        HStack(spacing: 10) {
            Text(emoji)
            Text(text)
                .font(.subheadline.bold())
        }
    }

    @ViewBuilder
    private func purchaseSection(_ product: Product) -> some View {
        VStack(spacing: 12) {
            Text("\(product.displayPrice) / 月")
                .font(.title3.bold())

            Button {
                Task { await purchase(product) }
            } label: {
                Group {
                    if isPurchasing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("プレミアムをはじめる")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppConfig.Theme.primary)
                .foregroundColor(.white)
                .cornerRadius(16)
            }
            .disabled(isPurchasing)
            .padding(.horizontal, 24)
        }
    }

    // MARK: - 購入処理

    private func purchase(_ product: Product) async {
        guard !isPurchasing else { return }
        isPurchasing = true
        defer { isPurchasing = false }
        environment.analytics.track(.purchaseButtonTapped(productID: product.id))
        do {
            switch try await entitlements.purchase(product) {
            case .success:
                environment.analytics.track(.purchaseCompleted(productID: product.id))
                continueAfterPurchase()
            case .pending:
                message = "購入の承認待ちです。承認されると自動的に反映されます。"
            case .cancelled:
                break // ユーザー都合のキャンセル。何も表示しない
            }
        } catch {
            message = AppConfig.ErrorText.purchaseFailed
        }
    }

    private func restore() async {
        environment.analytics.track(.restoreTapped)
        do {
            try await entitlements.restorePurchases()
            if entitlements.isPremium {
                message = "購入を復元しました🎉"
                continueAfterPurchase()
            } else {
                message = AppConfig.ErrorText.restoreNothing
            }
        } catch {
            message = AppConfig.ErrorText.purchaseFailed
        }
    }

    /// 購入完了後、Paywall を開いた文脈に応じて自然な画面へ戻す
    private func continueAfterPurchase() {
        switch source {
        case .lockedItem(let itemID):
            if let item = environment.contentStore?.item(id: itemID) {
                appState.path = [.menu, .capture(item)] // 解放された診断へ直行
            } else {
                appState.goToMenu()
            }
        case .adSkip:
            appState.showResult() // 広告なしでそのまま結果へ
        case .settings:
            if appState.path.count > 1 {
                appState.path.removeLast()
            } else {
                appState.goToMenu()
            }
        }
    }
}
