# PROJECT_STRUCTURE

KidsHabit のディレクトリ構造と、各モジュールの責務を説明します。
SwiftUI を土台に、ゲーム画面のみ SpriteKit を `SpriteView` でブリッジする構成です。

---

## 全体像

```
KidsHabit/
├── project.yml                         # xcodegen 設定（.xcodeproj 生成元）
├── README.md
├── PROJECT_STRUCTURE.md
├── ROADMAP.md
├── .gitignore
└── KidsHabit/
    ├── App/
    │   ├── KidsHabitApp.swift          # @main エントリポイント
    │   └── AppState.swift              # アプリ全体の状態（画面遷移・課金状態の集約）
    ├── Features/
    │   ├── Home/                       # ホーム画面（カテゴリ一覧）
    │   ├── ToothBrushing/              # 歯磨き（無料・フェーズ1）
    │   ├── Cleanup/                    # 片付け（無料・フェーズ1）
    │   ├── Meal/                       # 食事（サブスク・フェーズ1）
    │   ├── Dressing/                   # 着替え（サブスク・フェーズ1）
    │   ├── Common/                     # 達成演出・クリア画面など共通UI
    │   └── Paywall/                    # サブスク案内画面
    ├── Core/
    │   ├── Audio/                      # BGM・SE 再生マネージャ
    │   ├── IAP/                        # StoreKit 2 ラッパー
    │   ├── Storage/                    # UserDefaults ラッパー
    │   ├── Models/                     # カテゴリ定義など横断モデル
    │   ├── Constants/                  # Constants.swift（マジックナンバー集約）
    │   └── Extensions/                 # Color / View などの拡張
    ├── Resources/
    │   ├── Assets.xcassets             # 画像アセット
    │   ├── Sounds/                     # BGM・SE
    │   └── Localizable.strings         # 文字列外部化（日本語）
    └── Info.plist
└── KidsHabitTests/                     # Core モジュールのユニットテスト
```

---

## レイヤーと責務

### App/ — アプリ骨格

| ファイル | 責務 |
| --- | --- |
| `KidsHabitApp.swift` | `@main`。`AppState` を生成し、ルート View に `.environmentObject` で注入。横向き固定はここ + Info.plist で担保。 |
| `AppState.swift` | `ObservableObject`。現在の画面（`enum Route`）、購入状態への参照、BGM 状態などアプリ横断の状態を集約。各 Feature の ViewModel からは直接触らず、必要な値だけ受け渡す。 |

### Features/ — 画面・機能単位

各 Feature は原則 `<Name>View.swift` / `<Name>ViewModel.swift` / 必要なら `<Name>Scene.swift`（SpriteKit）で構成します。MVVM ライク。

| ディレクトリ | 責務 |
| --- | --- |
| `Home/` | カテゴリ4枚のカード表示。無料/サブスクアイコン。カード選択で遷移を `AppState` に依頼。 |
| `ToothBrushing/` | 歯磨き4場面 + うがい。なぞりのパーセンテージ判定は SpriteKit シーン側。 |
| `Cleanup/` | 片付け4場面。ドラッグ＆ドロップ + スナップ判定。靴ペア合わせミニゲーム。 |
| `Meal/` | 食事4セット×4品。タップ＆ドラッグで口元へ運ぶ。口開閉アニメ。 |
| `Dressing/` | 着替え4場面。4部位（頭・上半身・下半身・足元）別スナップ判定。 |
| `Common/` | 達成演出（3段階）、クリア画面（「もういちど」「つぎへ」）、ホームボタン、ローディング。全 Feature が再利用。 |
| `Paywall/` | サブスク案内。購入・復元ボタン。`IAPManager` を呼ぶ。 |

### Core/ — 横断ロジック（テスト対象の中心）

| ディレクトリ | 責務 |
| --- | --- |
| `Audio/` | `AudioManager`（`ObservableObject`）。BGM/SE 再生、音量 ON/OFF、同時再生管理。AVFoundation ラッパー。ファイル名を差し替えるだけで実素材に移行できる。 |
| `IAP/` | `IAPManager`（`ObservableObject`）。StoreKit 2 で商品取得・購入・復元・`Transaction.updates` 監視。購入結果を `StorageManager` に反映。 |
| `Storage/` | `StorageManager`。UserDefaults ラッパー。**保存するのは課金フラグのみ**（要件どおり）。キーは型安全に定義。 |
| `Models/` | `HabitCategory`（enum: toothBrushing/cleanup/meal/dressing）など横断モデル。`isPremium` 等のメタ情報を持ち、カテゴリ追加に強い構造。 |
| `Constants/` | `Constants.swift`。スナップ閾値・ヒット判定半径・クリア割合（例 80%）・アニメ時間などのマジックナンバーを集約。 |
| `Extensions/` | `Color+App`, `View+HitArea`（幼児向けの大きめヒット判定ヘルパ）など。 |

### Resources/

| 項目 | 内容 |
| --- | --- |
| `Assets.xcassets` | 画像。初期は空 or プレースホルダー。命名規則は README 参照。 |
| `Sounds/` | BGM/SE。初期は無音ファイル or 未配置。 |
| `Localizable.strings` | 全 UI 文字列。ひらがな・カタカナのみ。 |

### KidsHabitTests/

Core モジュール（IAP / Audio / Storage）に絞ったユニットテスト。判定ロジック（なぞり割合・スナップ）もテスト可能な純粋関数に切り出し、対象に含める。

---

## 拡張性の考え方（フェーズ2以降）

- カテゴリは `HabitCategory` enum に case を追加し、対応 Feature ディレクトリを足すだけで増やせる。ホーム画面は enum を列挙してカードを生成するため、UI 側の変更は最小。
- 場面データ（食事のセット、着替えの部位など）は Swift の値型（`struct`/`enum`）または JSON で外部化し、コードロジックと分離。手洗い・準備・お風呂・料理は同じパターンで追加可能。
- スナップ判定・なぞり判定・達成演出は `Common`/`Core` の共通機能として実装し、新カテゴリから再利用する。

---

## データフロー（概略）

```
KidsHabitApp
   └─ AppState (@EnvironmentObject)
        ├─ Route（現在の画面）
        ├─ IAPManager（購入状態）───→ StorageManager（課金フラグ）
        └─ AudioManager（BGM/SE）

HomeView ──(選択)──▶ AppState.route 更新
   ├─ 無料カテゴリ      → ゲーム画面へ
   └─ サブスクカテゴリ  → 未購入なら Paywall、購入済みならゲーム画面へ

ゲーム画面（SwiftUI ラッパ）
   └─ SpriteView(scene:) ── 操作判定 → クリア → Common の達成演出 → クリア画面
```
