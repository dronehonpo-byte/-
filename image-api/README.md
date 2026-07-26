# OpenAI 画像生成 × Claude Code 連携（MCP サーバー）

OpenAI の画像生成 API（**gpt-image-1** / DALL·E）を **MCP サーバー**として
Claude Code につなぎ、チャットから `generate_image` ツールで画像を作れるようにします。

APIキーは**コードにもリポジトリにも保存しません**。実行時に環境変数
`OPENAI_API_KEY` から読み込みます。

---

## ⚠️ 最初に — 漏れたキーは失効させる

セットアップ用にどこか（チャット等）へ貼ってしまった APIキーは、**漏洩扱い**にしてください。

1. https://platform.openai.com/api-keys で該当キーを **Revoke（失効）**
2. **新しいキーを再発行**して、以下の手順ではそちらを使う

---

## セットアップ

### 1. 依存パッケージをインストール

システムを汚さないよう venv を推奨します。

```bash
python3 -m venv image-api/.venv
image-api/.venv/bin/pip install -r image-api/requirements.txt
```

（システムの Python にそのまま入れる場合は
`pip install -r image-api/requirements.txt` でも可）

### 2. APIキーを環境変数に設定

**方法A: シェルで export（そのセッションのみ）**

```bash
export OPENAI_API_KEY="sk-...（再発行した新しいキー）"
```

**方法B: `.env` ファイル（`.gitignore` 済み・コミットされません）**

```bash
cp image-api/.env.example image-api/.env
# image-api/.env を編集して新しいキーを記入
# 起動前に読み込む例:
set -a && . image-api/.env && set +a
```

### 3. venv を使う場合は Python の場所を指定

`.mcp.json` は既定で `python3` を使います。venv を作ったら次を設定してください。

```bash
export OPENAI_IMAGE_PYTHON="$(pwd)/image-api/.venv/bin/python"
```

### 4. Claude Code を起動（このリポジトリのルートで）

```bash
claude
```

リポジトリ直下の `.mcp.json` が読み込まれ、`openai-image` サーバーが接続されます。
初回はプロジェクトスコープの MCP サーバー利用の許可を求められることがあるので承認してください。
`/mcp` で接続状態を確認できます。

---

## 使い方

Claude Code のチャットで、画像を作ってほしいと頼むだけです。例:

> 「夕暮れの富士山を水彩画風で、透過背景の PNG で作って」

Claude が `generate_image` ツールを呼び、生成画像を `generated-images/`
（`OPENAI_IMAGE_OUTPUT_DIR` で変更可）に保存します。

### `generate_image` のパラメータ

| 引数 | 既定 | 説明 |
| --- | --- | --- |
| `prompt` | （必須） | 生成したい画像の説明。日本語・英語どちらも可 |
| `size` | `1024x1024` | `1024x1024` / `1536x1024`(横長) / `1024x1536`(縦長) / `auto` |
| `quality` | `auto` | `low` / `medium` / `high` / `auto` |
| `background` | `auto` | `transparent`(透過) / `opaque` / `auto`（gpt-image-1 のみ） |
| `output_format` | `png` | `png` / `jpeg` / `webp`（gpt-image-1 のみ） |
| `n` | `1` | 生成枚数（1〜4） |
| `output_dir` | 環境変数 | 保存先ディレクトリ |

---

## 環境変数まとめ

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | ✅ | OpenAI の APIキー。**コードには書かない** |
| `OPENAI_IMAGE_MODEL` | | 既定 `gpt-image-1`。`dall-e-3` 等に切替可 |
| `OPENAI_IMAGE_OUTPUT_DIR` | | 生成画像の保存先。既定 `generated-images` |
| `OPENAI_IMAGE_PYTHON` | | MCP サーバー起動に使う Python。venv 使用時に指定 |

---

## トラブルシューティング

- **`OPENAI_API_KEY が設定されていません`**
  → キーが環境変数に渡っていません。手順2を確認。Claude Code を起動した
  シェルに `OPENAI_API_KEY` が入っている必要があります。
- **`MCP SDK が見つかりません` / `openai パッケージが見つかりません`**
  → 依存未インストール、または `OPENAI_IMAGE_PYTHON` が依存の入っていない
  Python を指しています。手順1・3を確認。
- **`/mcp` に `openai-image` が出ない**
  → リポジトリのルートで `claude` を起動しているか、`.mcp.json` の許可を
  承認したかを確認。
