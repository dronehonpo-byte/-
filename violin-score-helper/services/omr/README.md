# OMR サービス（Audiveris / OSS）

スキャン楽譜（PDF・PNG・JPEG）を受け取り、OSS の [Audiveris](https://github.com/Audiveris/audiveris) で
**MusicXML** に変換して返す HTTP サービスです。従量課金の外部AI/Vision APIは使いません。

アプリ本体（Next.js）の `app/api/omr/route.ts` が、環境変数 `OMR_SERVICE_URL` で指定した
このサービスへスキャンを転送し、返ってきた MusicXML を `lib/musicXml.ts` で音符データに変換します。

```
[Next.js on Vercel]  --(scan)-->  [このサービス: Audiveris]  --(MusicXML)-->  [Next.js: 変換→色分け等]
```

## API 契約

- `POST /omr`（`multipart/form-data`, フィールド名 `file`）
  - 200: `{ "musicXml": string, "width": number, "height": number, "pageImage": string(dataURL) }`
    - `width/height`: 認識したページPNGのピクセル寸法（座標換算の基準）
    - `pageImage`: 画面プレビュー用の同一ラスタ（座標整合のため）
  - 4xx/5xx: `{ "error": string }`
- `GET /health` → `ok`

## ローカルで動かす

```bash
# 1) コンテナをビルド
docker build -t violin-omr services/omr

# 2) 起動（8080）
docker run --rm -p 8080:8080 violin-omr

# 3) 動作確認
curl -F "file=@/path/to/score.pdf" http://localhost:8080/omr | head -c 400
```

アプリ側は `.env.local` に次を設定：

```
OMR_SERVICE_URL=http://localhost:8080
```

## Google Cloud Run にデプロイ（推奨・スケール0で実質無料）

```bash
# 事前: gcloud CLI で認証・プロジェクト設定済みとする
gcloud run deploy violin-omr \
  --source services/omr \
  --region asia-northeast1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 1 \
  --min-instances 0 \
  --allow-unauthenticated
```

- `--min-instances 0`：アイドル時はスケール0＝課金なし（＝実質無料枠内）。
- `--memory 2Gi`：Audiveris はメモリを使うため 2GB 目安（不足なら 4Gi）。
- `--concurrency 1`：1リクエスト＝重い処理のため同時実行は1に。
- 出てきた URL を、アプリ側（Vercel）の環境変数 `OMR_SERVICE_URL` に設定。

> セキュリティ: 社内利用等でアクセス制限したい場合は `--allow-unauthenticated` を外し、
> Cloud Run の IAM 認証やトークン付与に切り替えてください（アプリ側の呼び出しに認証ヘッダ追加が必要）。

## 制約・注意（フェーズ2で検討）

- **リクエストサイズ**: スキャンは `app/api/omr`（Vercel関数）経由で本サービスへ転送される。
  Vercel のサーバーレス関数にはリクエストボディ上限（Hobbyで約4.5MB）があるため、
  高解像度PDF/画像が大きいと転送に失敗し得る。対策候補：
  (a) アップロード前にクライアントで適度に縮小、(b) ブラウザから本サービスへ直接アップロード
  （その場合は本サービスに CORS と認証を追加）。
- **コールドスタート**: スケール0運用では久々の初回リクエストが数十秒待ちになることがある。

## 初回ビルドで確認すること（重要）

このDockerfileは雛形です。Audiveris のバージョンにより次が変わり得ます：

1. **インストール先ディレクトリ名** … `build/install/<name>` の `<name>`。
   `AUDIVERIS_BIN=/opt/audiveris/bin/Audiveris` が合っているか確認。
2. **gradle タスク** … `installDist` で配布物が出るか（出ない場合 `distZip` 等）。
3. **TESSDATA_PREFIX** … Tesseract の tessdata パス（`/usr/share/tesseract-ocr/4.00/tessdata`
   または `/5/tessdata`）。`tesseract --list-langs` で確認。
4. **言語データ** … 楽譜中のテキスト認識に必要なら `tesseract-ocr-deu` 等を追加。

## 認識精度の前提（アプリ側の警告と対応）

Audiveris は以下を満たすスキャンで最も安定します（アプリのアップロード画面にも明記）：

- 傾きなし（水平）／影・光ムラなし／300dpi以上／白背景に黒音符でコントラスト明瞭

撮影写真は非対応。アプリ側はアップロード画像を簡易判定し、写真らしい場合に警告します
（`lib/scanQuality.ts`）。
