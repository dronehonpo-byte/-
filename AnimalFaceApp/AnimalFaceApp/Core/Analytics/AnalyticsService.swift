import Foundation

/// 匿名利用データのイベント。
/// 個人特定情報・画像・顔特徴量は絶対に含めないこと（要件 7）。
enum AnalyticsEvent {
    case appLaunched
    case onboardingCompleted
    /// 性別・年齢は任意入力の匿名属性（"skip" を含む）
    case userInfoSubmitted(gender: String, ageGroup: String)
    case diagnosisStarted(itemID: String)
    case diagnosisCompleted(itemID: String)
    case diagnosisFailed(itemID: String, reason: String)
    case adShown(kind: String) // "interstitial" / "banner"
    case paywallShown(source: String)
    case purchaseButtonTapped(productID: String)
    case purchaseCompleted(productID: String)
    case restoreTapped
    case shareTapped(itemID: String)
}

/// 分析基盤の差し替え口。実装（Firebase 等）は将来注入する。
protocol AnalyticsService {
    func track(_ event: AnalyticsEvent)
}

/// 初期リリース用のデフォルト実装：デバッグログのみ（外部送信なし）。
/// TODO(将来): 本番の匿名分析基盤（診断回数・広告表示回数・課金クリック数）に差し替え
struct ConsoleAnalyticsService: AnalyticsService {
    func track(_ event: AnalyticsEvent) {
        #if DEBUG
        print("[Analytics] \(event)")
        #endif
    }
}
