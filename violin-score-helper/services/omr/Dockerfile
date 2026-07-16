# =====================================================================
# Audiveris(OSS) 楽譜認識サービス コンテナ
# =====================================================================
# 構成: 3 ステージ
#   1) audiveris-build … Audiveris を JDK でビルド（installDist）
#   2) node-deps        … Node ラッパーの依存を用意
#   3) runtime          … JRE + tesseract + poppler + node で稼働
#
# ★このDockerfileは初回ビルドで検証してください（Audiverisのバージョンにより
#   インストール先ディレクトリ名 / gradleタスク / TESSDATA パスが変わり得ます）。
#   詳細は README.md「初回ビルドで確認すること」を参照。
# =====================================================================

# ---- Stage 1: Audiveris を source からビルド ----
# Audiveris master は Java 25 でのコンパイルを要求するため JDK 25 を使う
FROM eclipse-temurin:25-jdk-jammy AS audiveris-build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /src
# 必要に応じて特定タグに固定してください（例: --branch 5.6.0）
RUN git clone --depth 1 https://github.com/Audiveris/audiveris.git .
# Audiveris は multi-module 構成。実行アプリは :app サブプロジェクト。
# 配布物は app/build/install/<applicationName>/bin/<launcher> に生成される。
RUN ./gradlew --no-daemon :app:installDist -x test
# 生成物を固定パス /opt/audiveris へ集約（名前の大文字小文字差を吸収）
RUN mkdir -p /opt/audiveris && cp -r app/build/install/*/. /opt/audiveris/

# ---- Stage 2: Node ラッパー依存 ----
FROM node:20-bookworm-slim AS node-deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ---- Stage 3: 実行イメージ ----
# 実行も Java 25 が必要（JDKイメージを流用。25-jre-jammy が無い環境でも確実にpullできる）
FROM eclipse-temurin:25-jdk-jammy AS runtime
# 認識に必要なネイティブ依存: Tesseract(OCR), poppler(PDF→PNG), フォント
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-eng \
      poppler-utils \
      fontconfig libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

# Node ランタイム（バイナリのみ流用。npm は不要）
COPY --from=node:20-bookworm-slim /usr/local/bin/node /usr/local/bin/node

# Audiveris 本体
COPY --from=audiveris-build /opt/audiveris /opt/audiveris
# 起動スクリプト名（Audiveris / audiveris 等の差）を吸収して固定パスへ
RUN ln -sf "$(find /opt/audiveris/bin -maxdepth 1 -type f ! -name '*.bat' | head -1)" \
      /usr/local/bin/audiveris

WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY server.mjs ./

ENV AUDIVERIS_BIN=/usr/local/bin/audiveris \
    RASTER_DPI=300 \
    PORT=8080 \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
# ↑ TESSDATA_PREFIX は環境により /usr/share/tesseract-ocr/5/tessdata 等。要確認。

EXPOSE 8080
CMD ["node", "server.mjs"]
