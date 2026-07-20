import SwiftUI
import UIKit
#if canImport(GoogleMobileAds)
import GoogleMobileAds
#endif

/// AdMob ラッパー。
/// - Google Mobile Ads SDK が未導入（canImport 不成立）の場合はスタブ動作となり、
///   広告なしで即座に処理を継続する（ビルドは常に通る）。
/// - 広告の読み込み・表示に失敗しても診断は必ず続行する（エラー表示なし・要件 5-2）。
/// - 課金ユーザーには一切広告を出さない（呼び出し側 + 本クラスの二重ガード）。
@MainActor
final class AdsCoordinator: NSObject, ObservableObject {
    @Published private(set) var isInterstitialReady = false

    private let analytics: AnalyticsService
    /// 課金状態の参照（表示直前の最終ガードに使用）
    var isPremiumProvider: () -> Bool = { false }

    private var onInterstitialFinished: (() -> Void)?

    #if canImport(GoogleMobileAds)
    private var interstitial: GADInterstitialAd?
    #endif

    init(analytics: AnalyticsService) {
        self.analytics = analytics
        super.init()
    }

    /// SDK 初期化＋最初のインタースティシャル先読み。アプリ起動時に一度呼ぶ。
    func start() {
        #if canImport(GoogleMobileAds)
        GADMobileAds.sharedInstance().start(completionHandler: nil)
        #endif
        preloadInterstitial()
    }

    func preloadInterstitial() {
        guard !isPremiumProvider() else { return }
        #if canImport(GoogleMobileAds)
        GADInterstitialAd.load(
            withAdUnitID: AppConfig.Ads.interstitialUnitID,
            request: GADRequest()
        ) { [weak self] ad, _ in
            // 読み込み失敗（ad == nil）でもエラー表示はしない。準備なしとして扱うだけ
            Task { @MainActor [weak self] in
                self?.interstitial = ad
                self?.isInterstitialReady = (ad != nil)
            }
        }
        #endif
    }

    /// インタースティシャルを表示する。表示できない状況（SDK未導入・未読込・
    /// 表示失敗・課金済み）では何も出さずに即 onFinished を呼び、診断を継続する。
    func showInterstitial(onFinished: @escaping () -> Void) {
        guard !isPremiumProvider() else {
            onFinished()
            return
        }
        #if canImport(GoogleMobileAds)
        guard let interstitial, let root = Self.topViewController() else {
            onFinished()
            preloadInterstitial()
            return
        }
        self.onInterstitialFinished = onFinished
        self.interstitial = nil
        isInterstitialReady = false
        interstitial.fullScreenContentDelegate = self
        interstitial.present(fromRootViewController: root)
        analytics.track(.adShown(kind: "interstitial"))
        #else
        onFinished()
        #endif
    }

    private func finishInterstitial() {
        let completion = onInterstitialFinished
        onInterstitialFinished = nil
        preloadInterstitial()
        completion?()
    }

    static func topViewController() -> UIViewController? {
        let root = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)?
            .rootViewController
        var top = root
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }
}

#if canImport(GoogleMobileAds)
extension AdsCoordinator: GADFullScreenContentDelegate {
    nonisolated func adDidDismissFullScreenContent(_ ad: GADFullScreenPresentingAd) {
        Task { @MainActor [weak self] in self?.finishInterstitial() }
    }

    nonisolated func ad(
        _ ad: GADFullScreenPresentingAd,
        didFailToPresentFullScreenContentWithError error: Error
    ) {
        // 表示失敗でも診断は続行する
        Task { @MainActor [weak self] in self?.finishInterstitial() }
    }
}
#endif
