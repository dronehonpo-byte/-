#!/usr/bin/env python3
"""OpenAI 画像生成 (gpt-image-1 / DALL·E) を Claude Code につなぐ MCP サーバー.

このスクリプトは stdio 上で MCP プロトコルを話し、Claude Code から
`generate_image` ツールとしてテキスト → 画像生成を呼べるようにする。

セキュリティ方針:
    APIキーはソースコードに一切埋め込まない。実行時に環境変数 ``OPENAI_API_KEY``
    から読み込む。キーが未設定ならツール呼び出し時に分かりやすいエラーを返す。

環境変数:
    OPENAI_API_KEY          必須。OpenAI の APIキー。
    OPENAI_IMAGE_MODEL      任意。既定 "gpt-image-1"。"dall-e-3" 等に切替可。
    OPENAI_IMAGE_OUTPUT_DIR 任意。生成画像の保存先。既定 "generated-images"。
"""
from __future__ import annotations

import base64
import datetime as dt
import os
import re
from pathlib import Path

try:
    from mcp.server.fastmcp import FastMCP
    from mcp.types import ImageContent, TextContent
except ModuleNotFoundError as exc:  # pragma: no cover - 環境不足時の案内
    raise SystemExit(
        "MCP SDK が見つかりません。\n"
        "  pip install -r image-api/requirements.txt\n"
        f"詳細: {exc}"
    )

try:
    from openai import OpenAI
except ModuleNotFoundError as exc:  # pragma: no cover - 環境不足時の案内
    raise SystemExit(
        "openai パッケージが見つかりません。\n"
        "  pip install -r image-api/requirements.txt\n"
        f"詳細: {exc}"
    )

MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
DEFAULT_OUTPUT_DIR = Path(
    os.environ.get("OPENAI_IMAGE_OUTPUT_DIR", "generated-images")
).expanduser()

_MIME = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp"}

mcp = FastMCP("openai-image")


def _client() -> OpenAI:
    """OpenAI クライアントを生成する。キー未設定なら明示的に失敗させる。"""
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY が設定されていません。"
            "有効な APIキーを環境変数に設定してから再実行してください。"
        )
    return OpenAI()


def _slug(text: str, limit: int = 40) -> str:
    """ファイル名に使える簡易スラッグを作る（日本語もある程度残す）。"""
    slug = re.sub(r"[^0-9A-Za-z぀-ヿ一-鿿]+", "-", text).strip("-")
    return slug[:limit] or "image"


@mcp.tool()
def generate_image(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "auto",
    background: str = "auto",
    output_format: str = "png",
    n: int = 1,
    output_dir: str | None = None,
) -> list:
    """テキストのプロンプトから画像を生成し、ファイルに保存する。

    Args:
        prompt: 生成したい画像の説明（日本語・英語どちらでも可）。
        size: 画像サイズ。"1024x1024" / "1536x1024"(横長) / "1024x1536"(縦長) / "auto"。
        quality: 画質。"low" / "medium" / "high" / "auto"。
        background: 背景。"transparent"(透過) / "opaque" / "auto"（gpt-image-1 のみ）。
        output_format: 保存形式。"png" / "jpeg" / "webp"（gpt-image-1 のみ）。
        n: 生成枚数（1〜4）。
        output_dir: 保存先ディレクトリ。未指定なら OPENAI_IMAGE_OUTPUT_DIR。

    Returns:
        保存先パスの説明テキストと、生成画像のプレビュー。
    """
    client = _client()
    n = max(1, min(int(n), 4))

    params: dict = {"model": MODEL, "prompt": prompt, "size": size, "quality": quality, "n": n}
    is_gpt_image = MODEL.startswith("gpt-image")
    if is_gpt_image:
        # gpt-image-1 は b64_json を既定で返す。背景・形式指定に対応。
        params["background"] = background
        params["output_format"] = output_format
        ext = output_format if output_format in _MIME else "png"
    else:
        # DALL·E 系はファイル保存のため b64_json を明示要求。
        params["response_format"] = "b64_json"
        ext = "png"

    resp = client.images.generate(**params)

    out_dir = Path(output_dir).expanduser() if output_dir else DEFAULT_OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    slug = _slug(prompt)
    mime = _MIME.get(ext, "image/png")

    saved: list[str] = []
    previews: list = []
    for i, item in enumerate(resp.data, start=1):
        b64 = item.b64_json
        fpath = out_dir / f"{ts}-{slug}-{i}.{ext}"
        fpath.write_bytes(base64.b64decode(b64))
        saved.append(str(fpath))
        previews.append(ImageContent(type="image", data=b64, mimeType=mime))

    summary = "画像を生成して保存しました:\n" + "\n".join(f"- {p}" for p in saved)
    return [TextContent(type="text", text=summary), *previews]


if __name__ == "__main__":
    mcp.run()
