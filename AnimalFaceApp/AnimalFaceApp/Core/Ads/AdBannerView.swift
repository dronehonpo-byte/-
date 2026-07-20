import SwiftUI

/// 画面下部バナー広告。
/// - 課金ユーザーには表示しない（高さも取らない）
/// - SDK 未導入時・読み込み失敗時は何も表示しない（レイアウトを崩さない）
struct AdBannerView: View {
    @EnvironmentObject private var entitlements: EntitlementManager

    var body: some View {
        if !entitlements.isPremium {
            #if canImport(GoogleMobileAds)
            BannerAdRepresentable()
                .frame(height: 50)
            #else
            EmptyView()
            #endif
        }
    }
}

#if canImport(GoogleMobileAds)
import GoogleMobileAds

private struct BannerAdRepresentable: UIViewRepresentable {
    func makeUIView(context: Context) -> GADBannerView {
        let banner = GADBannerView(adSize: GADAdSizeBanner)
        banner.adUnitID = AppConfig.Ads.bannerUnitID
        banner.rootViewController = AdsCoordinator.topViewController()
        banner.load(GADRequest())
        return banner
    }

    func updateUIView(_ uiView: GADBannerView, context: Context) {}
}
#endif
