import SwiftUI

/// 未決定事項の一元管理。
/// 本番値は株式会社Miyabee / クライアント確定後にこのファイルだけを差し替える。
/// ここ以外の場所に本番値・仮値を散らさないこと。
enum AppConfig {

    // MARK: - アプリ情報

    // TODO(Miyabee): アプリ名（未定）。App Store 表示名は Info.plist の CFBundleDisplayName も更新
    static let appName = "動物顔診断（仮）"

    // TODO(Miyabee): お問い合わせ先 URL またはメールアドレス
    static let contactURL = URL(string: "https://example.com/contact")
        ?? URL(fileURLWithPath: "/")

    // TODO(Miyabee): App Store 公開後のアプリ URL（シェア文言・QRコードに使用）
    static let appStoreURL = URL(string: "https://apps.apple.com/")
        ?? URL(fileURLWithPath: "/")

    // MARK: - テーマカラー
    // TODO(Miyabee): メインカラー未定（明るい色味・目立つ・SNS映え）。決定後に差し替え

    enum Theme {
        static let primary = Color(red: 1.00, green: 0.55, blue: 0.30)   // 仮: 明るいオレンジ
        static let secondary = Color(red: 1.00, green: 0.80, blue: 0.40) // 仮: イエロー
        static let accent = Color(red: 0.35, green: 0.70, blue: 0.90)    // 仮: スカイブルー
        static let background = Color(red: 1.00, green: 0.97, blue: 0.92)
        static let lockedGray = Color.gray.opacity(0.55)
    }

    // MARK: - 課金（StoreKit 2）

    enum Purchase {
        // TODO(Miyabee): App Store Connect で発行する本番 商品ID に差し替え
        // （Config.storekit のローカルテスト構成と一致させてある）
        static let monthlyProductID = "com.miyabee.animalface.premium.monthly"

        /// 現在販売中の商品ID一覧。将来のプラン追加（月額480円・年額4,980円等）は
        /// ここに商品IDを追加するだけで Paywall に並ぶ。
        static let allProductIDs: [String] = [monthlyProductID]

        // TODO(Miyabee): 価格表示のフォールバック文言（実価格は StoreKit から取得して表示する）
        static let fallbackPriceText = "月額200円"
    }

    // MARK: - 広告（AdMob）

    enum Ads {
        /// true の間は Google 公式テスト用 Ad Unit ID を使う。
        /// TODO(Miyabee): 本番リリース時に false へ切り替え、本番IDを設定
        static let useTestAdUnits = true

        // Google 公式テストID（変更禁止・そのまま使用可）
        static let testInterstitialUnitID = "ca-app-pub-3940256099942544/4411468910"
        static let testBannerUnitID = "ca-app-pub-3940256099942544/2934735716"

        // TODO(Miyabee): AdMob コンソールで発行する本番 Ad Unit ID に差し替え
        static let productionInterstitialUnitID = "REPLACE_WITH_PRODUCTION_INTERSTITIAL_ID"
        static let productionBannerUnitID = "REPLACE_WITH_PRODUCTION_BANNER_ID"

        static var interstitialUnitID: String {
            useTestAdUnits ? testInterstitialUnitID : productionInterstitialUnitID
        }
        static var bannerUnitID: String {
            useTestAdUnits ? testBannerUnitID : productionBannerUnitID
        }

        /// 無料ユーザーの「n回目以降」の診断結果表示前にインタースティシャルを出す
        static let interstitialFromDiagnosisCount = 2
    }

    // MARK: - エラー文言
    // TODO(Miyabee): 正式なエラー文言を作成予定。以下はプレースホルダ

    enum ErrorText {
        static let faceNotFound = "お顔をうまく見つけられませんでした🙇\n正面を向いて、明るい場所でもう一度試してみてください！"
        static let multipleFacesNote = "複数のお顔が写っている場合は、いちばん大きく写っている方を診断します。"
        static let cameraDenied = "カメラへのアクセスが許可されていません。\n設定アプリから許可すると撮影できます。"
        static let photoDenied = "写真へのアクセスが許可されていません。\n設定アプリから許可すると選択できます。"
        static let imageLoadFailed = "写真の読み込みに失敗しました。別の写真でもう一度試してみてください。"
        static let purchaseFailed = "購入を完了できませんでした。通信環境をご確認のうえ、もう一度お試しください。"
        static let restoreNothing = "復元できる購入が見つかりませんでした。"
        static let productLoadFailed = "プラン情報を読み込めませんでした。通信環境をご確認のうえ、もう一度お試しください。"
    }

    // MARK: - 注意書き（全診断結果に必須表示）

    static let entertainmentDisclaimer =
        "本診断はエンタメ目的であり、医学的・専門的な判定ではありません。"

    static let accuracyNote =
        "加工・マスク・強いメイクのお写真は診断の精度が下がることがあります。"

    // MARK: - シェア

    enum Share {
        /// シェアテキストの雛形。{title} {percent} が置換される
        static let textTemplate = "私は「{title}」で {percent} でした！ あなたも診断してみて👀"
    }

    // MARK: - 審査対策: 表示名ソフト化トグル

    /// 診断項目の「表示名だけ」を差し替えるマップ。内部id・スコアリング・診断文は不変のまま、
    /// App Store 審査で名称（メンヘラ/サイコパス等）が問題になったら、ここに `id: 表示名` を
    /// 足すだけで名称変更のみの再申請ができる（コードやロジックの改修は不要）。
    /// TODO(Miyabee): 審査結果を見て、必要なら下記コメントを有効化。
    /// 例) ["psychopath": "ミステリアス度診断", "menhera": "情緒ゆらぎ度診断", "sm": "主導権診断"]
    static let displayTitleOverrides: [String: String] = [:]
}
