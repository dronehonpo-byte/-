# 動物顔診断 iOSアプリ（初期リリース）

顔写真を端末内 AI（Vision framework）で解析し、動物顔タイプなどを診断するエンタメアプリ。
仕様書はリポジトリ直下の `CLAUDE.md` を参照。

## セットアップ

```bash
brew install xcodegen
cd AnimalFaceApp
xcodegen generate
open AnimalFaceApp.xcodeproj
```

- 最低対応 OS: iOS 16.0 / Swift 5.9+ / SwiftUI / MVVM
- 課金テスト: スキームに `Config.storekit` が設定済み（ローカル StoreKit テスト）

## Google Mobile Ads SDK（AdMob）の導入

広告コードは `#if canImport(GoogleMobileAds)` でガードされており、**SDK なしでもビルド・動作します**（広告はスタブ＝表示なしで診断続行）。実機広告テストを行う場合:

1. `project.yml` の `packages:` / `dependencies:` のコメントを外す
2. `xcodegen generate` を再実行
3. `Resources/Info.plist` の `GADApplicationIdentifier` は Google 公式のテスト用 App ID が設定済み。本番申請時に差し替え（`AppConfig.swift` の TODO 参照）

広告ユニット ID は開発中は Google 公式テスト ID を使用（`AppConfig.swift`）。

## 未決定事項（Miyabee 差し替えポイント）

すべて `AnimalFaceApp/Resources/Config/AppConfig.swift` に `// TODO(Miyabee):` で集約:

- アプリ名 / メインカラー / ロゴ・アイコン
- 動物画像 PNG 素材（現状は絵文字プレースホルダ）
- 診断文（`diagnosis_content.json`）/ エラー文言
- 課金 商品 ID・価格（初回 月額200円）
- AdMob 本番 Ad Unit ID / App ID
- 利用規約・プライバシーポリシー本文（`Resources/Legal/`）

## 診断チューニング

コード改変なしで JSON 編集のみで調整可能:

- `Resources/Config/animal_profiles.json` — 動物10タイプの特徴プロファイル・特徴量正規化レンジ・マッチ率レンジ
- `Resources/Config/diagnosis_content.json` — 診断項目定義・スコアリング重み・結果文（帯域別）
- `Resources/Config/hashtags.json` — シェア用ハッシュタグ

## プライバシー原則

撮影/選択した画像はメモリ上でのみ処理し、診断完了後に即時破棄。
ファイル・UserDefaults・キャッシュ・サーバーへの保存は一切行わない。

## テスト

`Tests/` にスコアリングエンジンの決定論・妥当性のユニットテストあり（⌘U）。
