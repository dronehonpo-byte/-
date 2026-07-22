# KidsHabit（仮）

2〜4歳児向けの知育習慣アプリ（iOS Native）。保護者が隣にいなくても、幼児が直感操作で「歯磨き・片付け・食事・着替え」といった生活習慣を楽しく身につけられることを目指します。

- **クライアント**: 株式会社RESTPLACE（大島考晴 様）
- **受託**: 株式会社Miyabee
- **想定ユーザー**: 2〜4歳の幼児
- **ゴール**: App Store 審査通過可能な MVP を段階的に構築する

> **注記**: アプリ正式名称・キャラクター・価格・Bundle ID 等は未確定事項です。本リポジトリでは仮の値を使用しています。詳細は本 README 末尾「未確定事項」を参照してください。

---

## 進め方（フェーズ構成）

本案件は2段階で進めます。

- **フェーズA（現在）**: **Web版デモ**を作成し、RESTPLACE 様にコンセプト・操作感を確認いただく → GO 判断
- **フェーズB（承認後）**: デモを土台に **iOS Native 版**（SwiftUI + SpriteKit）を実装

### Web版デモの動かし方

`web-demo/index.html` を**ブラウザで開くだけ**（ビルド不要・自己完結の単一HTML）。

```bash
# 例: ローカルサーバで開く（音声・タッチの挙動が本番に近い）
cd KidsHabit/web-demo
python3 -m http.server 8000
# → http://localhost:8000 を PC / iPad の Safari・Chrome で開く
```

- 横向き前提。ホーム → 4カテゴリ（歯磨き・片付け・食事・着替え）を実際に遊べます
- 音声案内は Web Speech API（日本語TTS）、SE は WebAudio 合成の**仮素材**（本番アセットへ差し替え可能）
- 食事・着替えはサブスク扱い。カード選択で **Paywall（保護者ゲート付き）** に遷移し、デモ購入で解放されます
- キャラ・アイテムは**絵文字＋図形のプレースホルダー**（実アセット未支給のため）

> このデモはあくまで**仕様確認用**です。実課金は行いません。iOS 版の StoreKit 2 / SpriteKit 実装はフェーズB（ROADMAP.md の Step 0〜9）で行います。

## 技術スタック

| 項目 | 内容 |
| --- | --- |
| プラットフォーム | iOS 16.0 以上（iPhone / iPad 両対応） |
| 画面方向 | 横向き（ランドスケープ）固定 |
| 言語 | Swift 5.9+ / SwiftUI |
| ゲーム描画 | SpriteKit（`SpriteView` でブリッジ） |
| 課金 | StoreKit 2（月額サブスク） |
| 音声 | AVFoundation |
| 保存 | UserDefaults（課金フラグのみ） |
| 多言語 | `Localizable.strings`（初期は日本語のみ） |
| 広告 | なし |
| Analytics | なし（フェーズ1では収集しない） |

---

## セットアップ手順

### 前提ツール

- macOS + Xcode 15 以上（iOS 16 SDK 以上）
- [xcodegen](https://github.com/yonaskolb/XcodeGen)（`.xcodeproj` を `project.yml` から生成）

```bash
# Homebrew で xcodegen を導入
brew install xcodegen
```

### プロジェクト生成 → 起動

```bash
cd KidsHabit

# project.yml から KidsHabit.xcodeproj を生成
xcodegen generate

# Xcode で開く
open KidsHabit.xcodeproj
```

Xcode 上でシミュレータ（iPhone / iPad いずれか）を選び、`⌘R` で実行します。
画面は横向き固定のため、シミュレータが縦向きの場合は `⌘→` / `⌘←` で回転させてください。

> `.xcodeproj` は生成物のため Git 管理対象外です（`.gitignore` 参照）。クローン後は必ず `xcodegen generate` を実行してください。

---

## アセット取り扱い

画像・キャラクター・音声はいずれも **現時点で未支給**です。差し替え可能な設計とし、以下の仮素材で実装します。

### 画像

- SF Symbols・単色図形（`Shape`）でプレースホルダーを構成
- 実アセットは `Resources/Assets.xcassets` に追加し、コード側は名前参照のみに留める

### 音声（BGM / SE）

- 仮の無音ファイル or システム音で実装
- `AudioManager` 経由で再生し、ファイル名を差し替えるだけで実素材に移行可能

### 命名規則

| 種別 | 規則 | 例 |
| --- | --- | --- |
| キャラ画像 | `char_<名前>_<状態>` | `char_boy_idle`, `char_boy_happy` |
| 背景 | `bg_<カテゴリ>_<場面>` | `bg_meal_set1` |
| アイテム | `item_<カテゴリ>_<名前>` | `item_meal_broccoli` |
| UI アイコン | `ui_<用途>` | `ui_home`, `ui_lock` |
| BGM | `bgm_<用途>.m4a` | `bgm_home.m4a` |
| SE | `se_<用途>.m4a` | `se_sparkle.m4a`, `se_brush.m4a` |

音声の実素材は効果音ラボ・魔王魂等のフリー素材を想定（**未選定**）。ライセンス表記が必要な場合は設定画面またはクレジットに追記します。

---

## フェーズ1 MVP スコープ

| カテゴリ | 課金 | 操作方式 | 場面数 |
| --- | --- | --- | --- |
| 歯磨き | 無料 | スワイプ・なぞる | 4場面 + うがい |
| 片付け | 無料 | ドラッグ＆ドロップ | 4場面 |
| 食事 | サブスク | タップ＆ドラッグ | 4セット×4品 |
| 着替え | サブスク | ドラッグ＆ドロップ | 4場面 |

> 手洗い・準備・お風呂・料理は**フェーズ2以降**。今回は実装しませんが、カテゴリを追加するだけで拡張できる設計にします。

---

## コーディング方針（抜粋）

- SwiftUI 優先、ゲーム画面のみ SpriteKit
- MVVM ライク（View / ViewModel / Model を分離。過度な抽象化はしない）
- `@Observable`（iOS 17+）は使わず、`ObservableObject` + `@Published`（iOS 16 サポートのため）
- 強制アンラップ `!` 禁止（`guard let` / `if let` を使用）
- マジックナンバー禁止（`Constants.swift` に集約）
- 判定ロジック・スナップ閾値には必ずコメント
- ユニットテストは Core モジュール（IAP・Audio・Storage）に絞る
- テキストはすべて**ひらがな・カタカナ**（漢字・難しい表現は使わない）

## コミット規約

Conventional Commits 準拠（日本語 OK）。

```
feat: 歯磨きカテゴリのなぞり判定を追加
fix: ドラッグ復帰アニメの戻り位置を修正
chore: xcodegen の project.yml を更新
```

---

## App Store / プライバシー方針

- 子ども向けのため**個人情報を収集しない**（ログイン機能なし）
- App Store Review Guideline **1.3（Kids Category）** に準拠
  - 課金は**保護者ゲート必須**
  - 外部リンクなし
  - 行動ターゲティング広告なし

---

## 未確定事項（実装前に要確認）

以下は要件定義書で未確定・要相談の項目です。判断が必要になった時点で、推測せず確認します。

| 項目 | 現状 | 仮の値 |
| --- | --- | --- |
| アプリタイトル | 未定 | `KidsHabit` |
| キャラクターデザイン | 新規制作予定・未支給 | プレースホルダー |
| サブスク価格 | ¥200/月想定・要最終決定 | ¥200/月 |
| Apple Developer アカウント | 未取得 | — |
| 音声素材 | フリー素材使用予定・未選定 | 無音/システム音 |
| Bundle Identifier | 仮 | `com.miyabee.kidshabit` |
| サブスク Product ID | 仮 | `com.miyabee.kidshabit.subscription.monthly` |

---

## 関連ドキュメント

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — ディレクトリ構造と各モジュールの責務
- [ROADMAP.md](./ROADMAP.md) — Step 0〜9 の実装ロードマップと TODO
