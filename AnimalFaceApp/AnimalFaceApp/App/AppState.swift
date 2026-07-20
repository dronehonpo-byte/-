import SwiftUI
import UIKit

/// Paywall を開いた文脈（購入成功後の遷移先を決める）
enum PaywallSource: Hashable {
    /// 有料診断の🔒をタップ
    case lockedItem(itemID: String)
    /// 「広告なしで結果を見る」を選択
    case adSkip
    /// 設定画面から
    case settings
}

enum LegalKind: String, Hashable {
    case terms
    case privacy
}

/// 画面ルーティング。将来の画面（履歴・相性診断・ランキング等）はここに case を追加する。
enum Route: Hashable {
    case userInfo
    case menu
    case capture(DiagnosisItem)
    case loading(DiagnosisItem)
    case adGate
    case result
    case paywall(PaywallSource)
    case settings
    case legal(LegalKind)
}

/// アプリ全体の状態＋ナビゲーション。
/// 注意: 課金状態はここに持たない（EntitlementManager が単一の真実源）。
@MainActor
final class AppState: ObservableObject {
    @Published var path: [Route] = []
    @Published var showOnboarding = false

    // MARK: - 永続化する軽量状態（画像・課金状態は含めない）

    @Published var hasCompletedOnboarding: Bool {
        didSet { defaults.set(hasCompletedOnboarding, forKey: Keys.onboarding) }
    }
    /// 完了した診断の累計回数（広告表示タイミングの判定に使用）
    @Published var completedDiagnosisCount: Int {
        didSet { defaults.set(completedDiagnosisCount, forKey: Keys.diagnosisCount) }
    }
    /// 任意入力のユーザー属性（今後のデータ参考用・匿名）
    @Published var userGender: String {
        didSet { defaults.set(userGender, forKey: Keys.gender) }
    }
    @Published var userAgeGroup: String {
        didSet { defaults.set(userAgeGroup, forKey: Keys.ageGroup) }
    }

    // MARK: - 診断フローの一時状態（メモリ上のみ・永続化禁止）

    /// 診断待ちの画像。診断完了/失敗と同時に必ず nil にする（プライバシー要件：即時破棄）。
    /// UserDefaults・ファイル・キャッシュへの書き出しは絶対にしないこと。
    @Published var pendingImage: UIImage?
    /// 直近の診断結果（画像への参照は含まれない）
    @Published var lastResult: DiagnosisResult?

    private let defaults: UserDefaults

    private enum Keys {
        static let onboarding = "hasCompletedOnboarding"
        static let diagnosisCount = "completedDiagnosisCount"
        static let gender = "userGender"
        static let ageGroup = "userAgeGroup"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.hasCompletedOnboarding = defaults.bool(forKey: Keys.onboarding)
        self.completedDiagnosisCount = defaults.integer(forKey: Keys.diagnosisCount)
        self.userGender = defaults.string(forKey: Keys.gender) ?? ""
        self.userAgeGroup = defaults.string(forKey: Keys.ageGroup) ?? ""
    }

    // MARK: - ナビゲーションヘルパー

    func goToMenu() {
        path = [.menu]
    }

    /// 診断フロー（capture/loading）を畳んで結果 or 広告ゲートへ差し替える
    func showDiagnosisOutcome(needsAdGate: Bool) {
        path = [.menu, needsAdGate ? .adGate : .result]
    }

    func showResult() {
        path = [.menu, .result]
    }
}
