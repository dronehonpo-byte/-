/**
 * OMR API ルート（§2）
 *
 * アップロード画像を Vision対応モデルの実APIに渡し、構造化JSONを返す。
 * ★モック・ダミー・シミュレーション禁止。実APIのみ。
 * APIキーは環境変数 ANTHROPIC_API_KEY（コードに直書きしない）。
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { OMR_MODEL_DEFAULT } from "@/lib/constants";
import { OMR_SYSTEM_PROMPT, buildOmrUserPrompt } from "@/lib/omrPrompt";
import type { ScoreAnalysis } from "@/types/score";

export const runtime = "nodejs";
export const maxDuration = 60;

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function detectMediaType(mime: string): MediaType {
  if (mime.includes("png")) return "image/png";
  if (mime.includes("webp")) return "image/webp";
  if (mime.includes("gif")) return "image/gif";
  return "image/jpeg";
}

/** レスポンステキストから JSON 本体だけを取り出す（コードフェンス混入対策） */
function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY が未設定です。.env.local にキーを設定してください（.env.example 参照）。",
      },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "画像の受信に失敗しました。" }, { status: 400 });
  }

  const file = form.get("image");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "image ファイルがありません。" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mediaType = detectMediaType(file.type);
  const model = process.env.OMR_MODEL || OMR_MODEL_DEFAULT;

  const client = new Anthropic({ apiKey });

  let responseText = "";
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 8000,
      system: OMR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: buildOmrUserPrompt(width, height) },
          ],
        },
      ],
    });
    responseText = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `OMR API 呼び出しに失敗しました: ${detail}` },
      { status: 502 },
    );
  }

  let analysis: ScoreAnalysis;
  try {
    analysis = JSON.parse(extractJson(responseText)) as ScoreAnalysis;
  } catch {
    return NextResponse.json(
      { error: "OMR 応答の JSON 解析に失敗しました。", raw: responseText.slice(0, 2000) },
      { status: 502 },
    );
  }

  // 画像実寸を確定値で上書き（モデル出力より信頼できる）
  if (width) analysis.imageWidth = width;
  if (height) analysis.imageHeight = height;
  analysis.meta = { ...(analysis.meta ?? {}), model };

  return NextResponse.json(analysis);
}
