import SwiftUI
import StoreKit

/// 画面3: 診断項目一覧（無料2種・有料4種🔒）。
struct DiagnosisMenuView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment
    @EnvironmentObject private var entitlements: EntitlementManager

    var body: some View {
        VStack(spacing: 0) {
            if let store = environment.contentStore {
                ScrollView {
                    VStack(spacing: 14) {
                        if !entitlements.isPremium {
                            premiumBanner
                        }
                        ForEach(store.content.items) { item in
                            itemCard(item)
                        }
                    }
                    .padding(16)
                }
            } else {
                // 設定読み込み失敗時もクラッシュさせずに案内する
                VStack(spacing: 12) {
                    Text("😢")
                        .font(.system(size: 48))
                    Text("診断データを読み込めませんでした。\nアプリを再起動してお試しください。")
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            AdBannerView()
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationTitle("診断メニュー")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    appState.path.append(.settings)
                } label: {
                    Image(systemName: "gearshape")
                }
            }
        }
    }

    private var premiumBanner: some View {
        Button {
            environment.analytics.track(.paywallShown(source: "menu_banner"))
            appState.path.append(.paywall(.settings))
        } label: {
            HStack {
                Text("✨")
                VStack(alignment: .leading, spacing: 2) {
                    Text("プレミアムプラン")
                        .font(.subheadline.bold())
                    Text("全診断解放・広告なし（\(priceText)）")
                        .font(.caption)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .padding(14)
            .background(
                LinearGradient(
                    colors: [AppConfig.Theme.primary, AppConfig.Theme.secondary],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .cornerRadius(14)
        }
    }

    private var priceText: String {
        entitlements.products.first?.displayPrice.appending("/月")
            ?? AppConfig.Purchase.fallbackPriceText
    }

    private func itemCard(_ item: DiagnosisItem) -> some View {
        let locked = item.isPremium && !entitlements.isPremium
        return Button {
            if locked {
                environment.analytics.track(.paywallShown(source: "locked_item_\(item.id)"))
                appState.path.append(.paywall(.lockedItem(itemID: item.id)))
            } else {
                appState.path.append(.capture(item))
            }
        } label: {
            HStack(spacing: 14) {
                Text(item.icon)
                    .font(.system(size: 34))
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(item.title)
                            .font(.headline)
                            .foregroundColor(.primary)
                        if item.isPremium {
                            Text(entitlements.isPremium ? "解放中" : "有料")
                                .font(.caption2.bold())
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(entitlements.isPremium
                                    ? AppConfig.Theme.accent.opacity(0.2)
                                    : AppConfig.Theme.secondary.opacity(0.35))
                                .cornerRadius(6)
                        }
                    }
                    Text(item.subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: locked ? "lock.fill" : "chevron.right")
                    .foregroundColor(locked ? AppConfig.Theme.lockedGray : .secondary)
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.06), radius: 6, y: 2)
        }
    }
}
