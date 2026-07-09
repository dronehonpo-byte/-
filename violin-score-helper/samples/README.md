# samples/ — OMR 精度確認用の楽譜画像置き場

このフォルダに、精度確認の基準となる楽譜画像（スマホ撮影 / スキャン）を置いてください。
**画像自体はコミットしません**（`.gitignore` 済み。市販楽譜の著作権・守秘のため）。

## 提供予定の基準4曲（要件定義書 §4.1）

1. リーディングのコンチェルト
2. ホーム・スイート・ホーム
3. マジャールの踊り
4. バッハ Vn協奏曲 No.1 第1楽章

## 使い方

```bash
# 1) .env.local に ANTHROPIC_API_KEY を設定
# 2) 開発サーバー起動
npm run dev
# 3) 別ターミナルで画像を通す（音高・符頭座標のログが出る）
npm run omr:check -- ./samples/reading.jpg ./samples/home-sweet-home.jpg
```

出力される「音高／小節／記載指番号／ローマ数字／符頭bbox」のログを見ながら、
`lib/omrPrompt.ts` のプロンプトと `lib/constants.ts` のしきい値を調整します。
