# YORISOI（よりそい）Web デモ版

介護支援アプリ **YORISOI** の内部デモ版です。クライアント確認用の **限定URL・非公開デモ** を想定しています。
本番は iOS / Android 両対応（React Native / Expo）へ移行予定で、本リポジトリはその移行を見据えた設計になっています。

対象ユーザーは 2 種類:

- **ご本人（見守られる側）**: 70〜90代の高齢者・認知症 / MCI の方（本人端末）
- **ご家族（見守る側）**: 40〜70代のご家族（別端末）

---

## セットアップ手順

前提: **Node.js 20 以上** と **pnpm** が必要です（npm / yarn は使いません）。

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動
pnpm dev
```

起動後、ブラウザで **http://localhost:3000** を開きます。

その他のコマンド:

```bash
pnpm build      # 本番ビルド
pnpm start      # 本番ビルドの起動
pnpm typecheck  # 型チェック（strict / any 禁止）
pnpm lint       # ESLint
```

> データはブラウザの **localStorage** にのみ保存されます。バックエンドはありません。
> 端末・ブラウザをまたいだ同期は行いません（デモの仕様）。

---

## 技術スタック

| 分類 | 採用 |
| --- | --- |
| フレームワーク | Next.js 15（App Router, TypeScript strict） |
| パッケージ管理 | pnpm |
| 状態管理 | Zustand（+ persist middleware） |
| スタイル | CSS Modules（Tailwind 不使用） |
| 読み上げ | Web Speech API（SpeechSynthesis） |
| 地図 | Leaflet + OpenStreetMap（APIキー不要） |
| 永続化 | localStorage |
| アイコン | lucide-react |
| QR | qrcode.react（生成）/ html5-qrcode（読み取り） |

**意図的に使っていないもの**: Tailwind CSS / Firebase・Supabase 等のバックエンド / Google Maps API /
Redux / Context API・styled-components。

---

## 画面遷移図

```
                              ┌─────────────────────────┐
                              │   /  ロール選択           │
                              │  （ご本人 / ご家族）       │
                              └───┬─────────┬────────┬───┘
                                  │         │        │
              ┌───────────────────┘         │        └──────────────┐
              ▼                             ▼                       ▼
   ┌──────────────────────┐    ┌──────────────────────┐   ┌──────────────────┐
   │ /senior  本人ホーム   │    │ /family ダッシュボード │   │ /pairing          │
   │ （カテゴリ大ボタン）   │    │ （見守り対象者カード）  │   │ QRペアリング       │
   └───┬──────────────┬───┘    └───┬──────────────┬───┘   │ ＋モックログイン    │
       │              │            │              │       └──────────────────┘
       ▼              ▼            ▼              ▼
┌───────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ /senior/       │ │ /senior/ │ │ /family/ │ │ /family/     │
│ category/[id]  │ │ settings │ │ map      │ │ history      │
│ 音声ボタン一覧  │ │ 家族が編集│ │ 地図・現在地│ │ ルート履歴     │
│ →TTS＋回答表示 │ │          │ │          │ │ （過去7日間）  │
└───────────────┘ └──────────┘ └──────────┘ └──────────────┘
```

画面遷移はすべて Next.js の `<Link>` / `router` を使い、フルリロードを避けています。

---

## `lib/platform/` の抽象化方針と RN 移行時の差し替え箇所

将来 React Native / Expo へ移行するため、**プラットフォーム依存 API はすべて `src/lib/platform/` の
インターフェース層に閉じ込めています**。UI・フック・ストアは、この抽象インターフェースにしか依存しません。

```
src/lib/platform/
├── speech.ts        ← interface: SpeechService（TTS）
├── speech.web.ts    ← Web 実装（Web Speech API / SpeechSynthesis）
├── location.ts      ← interface: LocationService（現在地取得）
├── location.web.ts  ← Web 実装（Geolocation API）
├── storage.ts       ← interface: StorageService（KV 永続化）
├── storage.web.ts   ← Web 実装（localStorage）
└── index.ts         ← Web 実装を束ねて export（唯一の解決点）
```

### 原則

1. **UI から直接 `window.speechSynthesis` や `navigator.geolocation` を呼ばない。**
   必ず `import { speech, location } from "@/lib/platform"` 経由で使います。
2. **インターフェース（`*.ts`）に DOM 型を露出させない。** RN と共有できる純粋な型のみ。
   （例: 位置は独自の `GeoPoint` 型で受け渡し、`GeolocationPosition` は Web 実装内に閉じる）
3. **ビジネスロジックは `src/hooks/` のカスタムフックに集約。** UI コンポーネントは薄く保つ。

### RN / Expo 移行時に差し替えるファイル

| 差し替えるもの | Web（現在） | RN / Expo（移行後の例） |
| --- | --- | --- |
| TTS | `speech.web.ts` | `speech.native.ts`（`expo-speech`） |
| 位置情報 | `location.web.ts` | `location.native.ts`（`expo-location`。**バックグラウンド取得・ジオフェンスもここで実装**） |
| 永続化 | `storage.web.ts` | `storage.native.ts`（`@react-native-async-storage/async-storage`） |
| 解決点 | `index.ts` の import 先 | `*.native.ts` に向け替えるだけ |
| アイコン解決 | `src/lib/icons.ts`（lucide-react） | `lucide-react-native` などに差し替え |
| 地図 | `src/components/MapView.tsx`（Leaflet） | `react-native-maps` 等で再実装 |
| スタイル | CSS Modules | StyleSheet / NativeWind 等（**破棄コストは Tailwind より低い想定**） |

> Metro / webpack の platform-extension（`speech.web.ts` / `speech.native.ts` を拡張子で自動解決）に
> 寄せることも可能ですが、デモでは意図を明示するため `index.ts` での明示的な集約にしています。

### 型の共有（`src/types/`）

`types/voice.ts` / `types/location.ts` / `types/user.ts` のドメイン型は Web / RN 両方で使う前提です。
プラットフォーム固有型を混ぜないルールにしています。

---

## 実装済み機能と Web 版の制約

### 機能①: 音声生活サポート（最優先・実装済み）

- **本人ホーム `/senior`**: カテゴリの大ボタングリッド（1画面 3〜4 個目安）
- **カテゴリ子画面 `/senior/category/[id]`**: 音声ボタン（アイコン大＋見出し大＋任意の写真）。
  タップで **TTS 読み上げ＋画面中央に大きな文字で回答表示**。「もう一度」「とじる」「もどる」。
- **設定 `/senior/settings`**（家族が本人端末で直接編集）:
  - 質問（見出し）・回答文・アイコン選択・写真アップロード（Base64 で localStorage 保存）
  - カテゴリの作成・名称変更・並び替え・削除
  - ボタンの追加・編集・並び替え・削除（**上限なし**）
  - TTS 設定（**音量: 大きめ / 話速: 遅め（既定 0.85）/ 日本語音声を優先**）、テスト再生
  - 初期テンプレートに戻す
- **初期テンプレート**（要件定義書 3-4）: 今日の予定 / デイサービスのお迎え / 病院の日 / 次にすること /
  今日は誰が来る / 今日は何曜日 / 今日は何日 / 薬は飲んだ / 朝・昼・夕ごはん / お風呂 / ゴミの日 /
  家族からのメッセージ / 今どこ / 天気 / 買い物予定 を投入済み。
  - 回答文に `{曜日}` `{日付}` `{年月日}` と書くと、**今日の日付に自動で置き換わります**
    （「今日は何曜日」等がデモでも常に正しく答えられます）。

### 機能②: 見守り UI（中優先・動作は限定的）

- **家族ダッシュボード `/family`**: 見守り対象者一覧（3 名のモック）。
  名前・現在地サマリ・最終更新時刻・状態バッジ（「自宅にいます」/「外出中」）。
- **地図 `/family/map`**: Leaflet + OpenStreetMap。現在地マーカー・自宅マーカー・**ジオフェンス円（半径100m）**。
  「今すぐ更新」で **閲覧者の Geolocation** を取得し、デモ用の擬似現在地として表示。
- **ルート履歴 `/family/history`**: 過去 7 日間のダミールートをポリライン表示。歩行時間・移動距離・記録地点数。

#### Web 版の制約（画面上部にバナー常時表示）

> **Webデモ版のため、バックグラウンド位置取得・自宅離脱通知・帰宅通知は動作しません（iOS/Android版で対応）。**

- 「自宅を離れた通知」「帰宅通知」ボタンは配置していますが、押すと **擬似的にトーストで動作イメージ** を表示するだけです。
- ジオフェンス判定（`useGeofence`）は現在地とジオフェンス円の内外を **その場で計算するだけ** の擬似実装です。

### アカウント・QR ペアリング（低優先・擬似実装）

- **ログイン**: Apple / Google 風のダミーボタン。実際は localStorage に保存するだけのモック。
- **QR ペアリング `/pairing`**: `qrcode.react` で QR 生成、`html5-qrcode` で読み取り（カメラ不可の環境向けに手動入力あり）。
  ペアリング ID は **UUID を localStorage に保存するだけ** の擬似実装。

### LP・ブランディング（最低優先）

- 仮の文字ロゴ「YORISOI」（温かみのあるオレンジ）。
- 配色は温かみのある淡色系（ベージュ・オレンジ・くすんだ緑）。

---

## UI / UX（高齢者・認知症の方向け）

- 基本フォント **20px 以上**、見出し **32px 以上**（トークンは `globals.css`）
- ボタン最小高さ **80px 以上**、大ボタンは幅いっぱい / グリッド
- 1 画面の色数を抑制、コントラスト重視
- 破壊的操作（削除・編集）は **本人ホームから到達不可**。家族向けの「設定」内に隔離
- アニメーション最小限（`prefers-reduced-motion` にも対応。地図のズームアニメも抑制）

---

## ディレクトリ構造

```
src/
├── app/
│   ├── layout.tsx / globals.css        ← ルート & デザイントークン
│   ├── page.tsx                        ← ロール選択
│   ├── senior/                         ← 本人モード（機能①）
│   │   ├── page.tsx                    ← 大ボタンホーム
│   │   ├── category/[id]/page.tsx      ← カテゴリ内ボタン → TTS＋回答
│   │   └── settings/page.tsx           ← 家族が登録・編集
│   ├── family/                         ← 家族モード（機能②）
│   │   ├── page.tsx                    ← 見守りダッシュボード
│   │   ├── map/page.tsx                ← 地図・現在地
│   │   └── history/page.tsx            ← ルート履歴
│   └── pairing/page.tsx                ← QRペアリング＋モックログイン
├── components/                         ← 表示コンポーネント（薄く）
├── hooks/                              ← ビジネスロジック（useVoiceButtons 等）
├── lib/
│   ├── platform/                       ← プラットフォーム抽象化層（★移行の要）
│   ├── icons.ts / id.ts / geo.ts       ← UI・汎用ユーティリティ
│   ├── initialData.ts                  ← 初期テンプレート & モックデータ
│   └── answerTemplate.ts               ← 回答文の日付プレースホルダ解決
├── stores/                             ← Zustand（voice / location / user / toast）
└── types/                              ← ドメイン型（Web / RN 共有）
```

---

## 補足: サーバー / クライアントコンポーネント

App Router のサーバーコンポーネントを尊重し、`"use client"` は **必要な葉コンポーネントのみ** に付けています
（`DemoBanner` などの静的表示はサーバーコンポーネント）。
localStorage 由来のデータに依存する表示は `useHydrated()` でハイドレーション後に描画し、
サーバー / クライアントの不一致を避けています。
