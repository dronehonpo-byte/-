# きっずしゅうかん（KidsHabitApp）

2〜4歳の幼児向けiOS知育習慣アプリ。歯磨き・片付け・食事・着替えなどの日常習慣を
「楽しいゲーム体験」として提供します。

- **対応OS**: iOS 16以上（iPhone / iPad、ランドスケープ固定）
- **技術**: Swift / SwiftUI + SpriteKit / StoreKit 2 / AVFoundation
- **アーキテクチャ**: MVVM + SpriteKit（SwiftUIがナビゲーション、SpriteKitがゲーム本体）

## セットアップ手順

このリポジトリには `.xcodeproj` の代わりに [XcodeGen](https://github.com/yonaskolb/XcodeGen) 用の
`project.yml` を同梱しています（バイナリ形式のプロジェクトファイルをGit管理しないため）。

```bash
# 1. XcodeGen をインストール（未導入の場合）
brew install xcodegen

# 2. プロジェクト生成
cd KidsHabitApp
xcodegen generate

# 3. Xcodeで開く
open KidsHabitApp.xcodeproj
```

生成後、以下を確認してください:

1. **StoreKit Configuration**: スキーム設定に `KidsHabitApp.storekit` が紐付いていること
   （project.yml で設定済み。Edit Scheme → Run → Options → StoreKit Configuration で確認）
2. **Signing**: TARGETS → Signing & Capabilities で自分のチームを選択
3. **In-App Purchase capability**: StoreKit 2 利用のため追加（Signing & Capabilities → +Capability）

## ディレクトリ構成

```
KidsHabitApp/
├── App/               エントリーポイント・ナビゲーション
├── Models/            Category / Scene / PurchaseManager（StoreKit 2 + Keychain）
├── Views/             SwiftUI画面（Splash / Home / CategoryTop / Games / Clear / Subscription / Settings）
├── GameScenes/        SpriteKit基盤（BaseGameScene / GameContainerView / パーティクル）
├── Audio/             AudioManager（BGM / SE / 音声読み上げ）
├── Localization/      ja.lproj（en / ko / zh-Hans はディレクトリのみ準備済み）
└── Resources/         Assets.xcassets / Sounds
```

## 実装済み機能（フェーズ1 MVP）

| カテゴリ | 課金 | 操作方式 | 場面数 |
|---|---|---|---|
| はみがき | 無料 | スワイプ（なぞり）＋うがい | 4＋うがい |
| かたづけ | 無料 | ドラッグ＆ドロップ（げんかんは靴ペア合わせ） | 4 |
| しょくじ | サブスク | タップ＆ドラッグ（口元へ運ぶ） | 4セット |
| きがえ | サブスク | ドラッグ＆ドロップ（4部位装着） | 4 |

- 進捗はセッション中のみ保持（永続化なし・仕様どおり）
- 1場面クリア演出（キラキラパーティクル約1.5秒）／カテゴリ完了演出（全画面演出＋ボタン）
- ペアレンタルゲート付き購入フロー（子どもが勝手に課金できない設計）
- BGM / SE のON・OFF設定（UserDefaults保存）
- 広告なし・完全オフライン動作

## 素材の差し替え方法

### 画像（キャラクター・背景）
現在はSF Symbols＋カラーブロックのプレースホルダーで実装しています。

- SwiftUI画面: 各Viewの `Image(systemName:)` を `Image("アセット名")` に差し替え
- SpriteKit: 各Sceneの `SKShapeNode` / 色付き `SKSpriteNode` を
  `SKSpriteNode(imageNamed:)` に差し替え
- `SceneData.imageName` にアセット名を定義済みのため、Assets.xcassets に同名画像を
  追加すればサムネイルに反映できます（SceneCard内の `Image(systemName: "photo")` を差し替え）

### 音声・SE
`Resources/Sounds/README.md` を参照。所定のファイル名でmp3を置くだけで自動切り替えされます。

### 多言語
`Localization/ja.lproj/Localizable.strings` が原本です。en / ko / zh-Hans ディレクトリは
準備済みなので、同名の `Localizable.strings` を置けば対応言語が増えます。

## 課金（StoreKit 2）

- 商品ID: `com.miyabee.kidshabitapp.monthly`（¥200/月・プレースホルダー）
- テストは同梱の `KidsHabitApp.storekit` で可能（App Store Connect登録不要）
- Transaction検証（`.verified` のみ受理）、Family Sharing対応（`revocationDate` 確認）
- 課金フラグはKeychain保存

**リリース前TODO**: App Store Connect で同一Product IDのサブスクリプションを登録すること。

## TestFlight提出手順

1. App Store Connect でアプリを作成（Bundle ID: `com.miyabee.kidshabitapp`）
2. サブスクリプション商品 `com.miyabee.kidshabitapp.monthly`（¥200/月）を登録
3. Xcodeで Signing & Capabilities のチームを設定
4. Product → Archive → Distribute App → TestFlight & App Store
5. App Store Connect → TestFlight でビルドを内部テスターへ配布
6. 子ども向けカテゴリのため、App Review では「ペアレンタルゲート」「広告なし」
   「外部リンクなし」の要件を満たしていることを確認

※ CI/CDはXcode Cloudを想定（App Store Connect側でワークフローを設定）。

## 今後のフェーズ

- フェーズ2: てあらい・じゅんび（ホームに「じゅんびちゅう」として表示済み）
- フェーズ3: おふろ・りょうり
