# oemer 精度検証環境 (Phase 0)

バイオリン楽譜の弦色分け Web アプリ開発の **Phase 0（精度検証）** 用の、使い捨て実験環境です。
OMR（光学楽譜認識）ライブラリ [oemer](https://github.com/BreezeWhite/oemer) が、
実際の教本スキャン画像でどこまで使えるかを判定することだけが目的です。

> ⚠️ これは本番アプリではありません。ローカル PC で「oemer が実用に耐えるか」を確認するための検証コードです。
> Web サーバー化・API 化・UI 構築は Phase 1 で行います（ここではやりません）。

## 何をするツールか

1. `input/` に置いた楽譜画像（PNG/JPG）を 1 枚ずつ oemer に渡して **MusicXML** を生成
2. `music21` で生成 MusicXML を解析し、音符数・小節数・調号・拍子・重音・臨時記号などの統計を抽出
3. `verovio` で「oemer が元楽譜をどう解釈したか」を **SVG 楽譜** に描画し、元画像と並べて目視確認

---

## 動作環境

- **Python 3.10 以上**（開発・確認は 3.11 で実施）
- macOS / Ubuntu の両対応
- GPU は不要。**CPU のみで動作**します（1 枚あたり数十秒〜数分かかることがあります）

---

## セットアップ

### macOS

```bash
# 1. リポジトリのこのディレクトリに移動
cd oemer-verify

# 2. Python 3.10+ を確認
python3 --version        # 例: Python 3.11.x

# 3. 仮想環境 (venv) を作成して有効化
python3 -m venv venv
source venv/bin/activate

# 4. 依存パッケージをインストール
pip install --upgrade pip
pip install -r requirements.txt
```

macOS で `verovio` / `cairosvg`（サンプル生成のみで使用）関連のビルドに失敗する場合は、
Homebrew で `cairo` を入れておくと安定します（通常は不要）:

```bash
brew install cairo pango
```

### Ubuntu

```bash
cd oemer-verify
python3 --version        # 3.10 以上であること

# venv に必要なら
sudo apt-get update && sudo apt-get install -y python3-venv

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> `oemer` は依存として `onnxruntime`（または `onnxruntime-gpu`）・`opencv` などを引き込みます。
> インストールに数分かかることがあります。

---

## ⚠️ 初回実行時：学習済みモデルの自動ダウンロード

**oemer は初回実行時に、学習済みモデル（約数百 MB）を自動ダウンロードします。**

- ダウンロード元: `https://github.com/BreezeWhite/oemer/releases/download/checkpoints/`
- 保存先: `venv/lib/python3.x/site-packages/oemer/checkpoints/` 配下
  - `unet_big/model.onnx`（1st モデル）
  - `seg_net/model.onnx`（2nd モデル）
  - `--use-tf` 使用時は `*.h5`（TensorFlow 版）も
- 初回の 1 枚目は、ダウンロード時間の分だけ余計に時間がかかります。2 枚目以降はダウンロード不要です。

初回だけ、動作確認を兼ねて 1 枚流しておくとスムーズです:

```bash
python verify.py
```

> 💡 **ネットワーク制限のある環境について**
> `github.com` へのアクセスが塞がれている環境（社内プロキシ・一部のクラウド実行環境など）では
> モデルを自動ダウンロードできず、`HTTP Error 403 / Forbidden` 等で失敗します。
> その場合は、**外に出られる PC で一度モデルをダウンロードし**、上記 `checkpoints/` 配下の
> `.onnx` ファイルを対象マシンの同じパスへ手動コピーしてください（トラブルシューティング参照）。

---

## 使い方

### 1. 画像を置く

`input/` ディレクトリに楽譜画像（PNG / JPG）を入れます。ファイル名は自由です。

```
input/
  suzuki_book1_p12.jpg
  my_scan_01.png
  ...
```

動作確認用のサンプル画像（パブリックドメインの短い旋律から生成したもの）が
最初から 2 枚入っています:

- `input/sample1_dmajor.png` … ニ長調 / 4-4拍子 / 単旋律（シャープ・臨時記号あり）
- `input/sample2_fmajor.png` … ヘ長調 / 3-4拍子 / 重音（ダブルストップ）あり

### 2. 認識を実行

```bash
python verify.py
```

`output/` に以下が出力されます:

| ファイル | 内容 |
|---|---|
| `{元ファイル名}.musicxml` | oemer が生成した生 MusicXML |
| `{元ファイル名}_report.txt` | 1 画像ごとの認識結果サマリー（音符数・小節数・調号・拍子・重音・臨時記号・処理時間・エラー） |
| `_summary.txt` | 全画像の集計（処理枚数・成功/失敗・音符数一覧・平均処理時間） |

主なオプション:

```bash
python verify.py --use-tf        # ONNX ではなく TensorFlow モデルで推論
python verify.py --timeout 1800  # 1 画像あたりのタイムアウト秒 (既定 1200)
python verify.py --input path --output path
```

### 3. 認識結果を可視化して見比べる

```bash
python visualize.py
```

`output/` に以下が出力されます:

| ファイル | 内容 |
|---|---|
| `{元ファイル名}_rendered.svg` | oemer 認識結果（MusicXML）を verovio で描画した楽譜 SVG |
| `compare.html` | 元画像（左）と認識結果 SVG（右）を並べた比較ページ |

`output/compare.html` をブラウザで開くと、oemer が元楽譜をどう解釈したかを
元画像と並べて目視確認できます。

---

## 完了確認（動作チェックの流れ）

```bash
source venv/bin/activate
python verify.py       # input/ の画像 → output/ にレポートと MusicXML
python visualize.py    # → output/ に SVG と compare.html
open output/compare.html          # macOS
# xdg-open output/compare.html    # Ubuntu
```

---

## サンプル画像の再生成（任意）

`input/` のサンプル画像は `make_sample.py` で生成しています（IMSLP 等から DL できない環境でも
動作確認できるように、パブリックドメインの旋律を楽譜として描画したもの）。作り直したい場合:

```bash
python make_sample.py
```

実運用では、このサンプルの代わりに **実際の教本スキャン画像** を `input/` に入れて検証してください。

---

## トラブルシューティング

### `oemer: command not found`
venv が有効化されていません。`source venv/bin/activate` を実行してから使ってください。

### 初回実行でモデルダウンロードが失敗する / `HTTP Error 403` / タイムアウト
`github.com` に出られない環境です。外部接続できる別の PC で一度 oemer を実行してモデルを取得し、
`site-packages/oemer/checkpoints/` 配下の `unet_big/model.onnx` と `seg_net/model.onnx`
（`--use-tf` 版なら `*.h5` も）を、対象マシンの同じパスへコピーしてください。
モデル URL は `oemer/ete.py` の `CHECKPOINTS_URL` に定義されています。

### `onnxruntime-gpu` が入っていて GPU 警告が出る
CPU のみでも `CPUExecutionProvider` で動作するため、警告は無視して問題ありません。
気になる場合は CPU 版に入れ替えてください:

```bash
pip uninstall -y onnxruntime-gpu
pip install onnxruntime
```

### 認識精度が低い / 音符が拾えない
- 画像を **高解像度**（300dpi 目安）でスキャンし、傾き・影・裏写りを減らすと改善します。
- 傾きが無いことが確実なら `--without-deskew` で前処理を省けます。
  逆に傾いた画像はデフォルト（deskew 有効）のままにしてください。
- 見開き 2 ページや複数段は、**1 段（1 システム）ずつ**に切り出すと安定することがあります。

### 処理が遅い / 固まって見える
CPU 推論のため 1 枚に数分かかることがあります。`--timeout` を延ばして待ってください。
1 枚目はモデルダウンロード分だけさらに時間がかかります。

### `music21` の解析でエラーが出る
oemer の出力 MusicXML が壊れている（認識に失敗している）可能性が高いです。
`_report.txt` の `music21 パース/解析エラー` と `oemer stderr` を確認してください。

### `visualize.py` で SVG が描画されない
先に `python verify.py` を実行して `output/` に `.musicxml` がある状態にしてください。
MusicXML が壊れている場合は `compare.html` にエラー内容が表示されます。

---

## ファイル構成

```
oemer-verify/
├── README.md            このファイル
├── requirements.txt     依存パッケージ
├── verify.py            検証本体（画像 → MusicXML → 統計レポート）
├── visualize.py         可視化（MusicXML → SVG / compare.html）
├── make_sample.py       動作確認用サンプル画像の生成（補助）
├── input/               入力画像を置く（サンプル 2 枚同梱）
└── output/              結果出力先（実行時に生成。git 管理外）
```
