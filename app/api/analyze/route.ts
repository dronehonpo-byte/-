import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, extractJson } from "@/lib/prompt";
import type { AnalysisMode, AnalysisResult } from "@/types/score";

export const runtime = "nodejs";
export const maxDuration = 120;

// 楽譜画像 → Claude Vision 解析

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const SUPPORTED: MediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function parseDataUrl(
  dataUrl: string
): { mediaType: MediaType; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mediaType = m[1] as MediaType;
  if (!SUPPORTED.includes(mediaType)) return null;
  return { mediaType, data: m[2] };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーに ANTHROPIC_API_KEY が設定されていません。" },
      { status: 500 }
    );
  }

  let body: {
    imageDataUrl?: string;
    width?: number;
    height?: number;
    mode?: AnalysisMode;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません。" },
      { status: 400 }
    );
  }

  const { imageDataUrl, width, height, mode } = body;
  if (!imageDataUrl || !width || !height) {
    return NextResponse.json(
      { error: "画像データが不足しています。" },
      { status: 400 }
    );
  }

  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "対応していない画像形式です。JPEG / PNG / GIF / WebP をご利用ください（PDF は画像化してからアップロードしてください）。",
      },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(mode ?? "A", width, height);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: parsed.mediaType,
                data: parsed.data,
              },
            },
            {
              type: "text",
              text: "この楽譜画像を解析し、指定された JSON スキーマで結果を返してください。",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "解析結果を取得できませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(extractJson(textBlock.text)) as AnalysisResult;
    } catch {
      return NextResponse.json(
        {
          error:
            "画像が読み取れませんでした。もう少し明るい環境で、楽譜全体がはっきり写るように撮影してみてください。",
        },
        { status: 422 }
      );
    }

    if (!analysis.notes || analysis.notes.length === 0) {
      return NextResponse.json(
        {
          error:
            "音符を検出できませんでした。楽譜がはっきり写っているか確認してください。",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    // Anthropic SDK のエラー種別ごとに親切なメッセージ
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "現在混み合っています。少し待ってから再度お試しください。" },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "API キーが無効です。サーバー設定を確認してください。" },
        { status: 401 }
      );
    }
    const detail = err instanceof Error ? err.message : "不明なエラー";
    console.error("解析エラー:", detail);
    return NextResponse.json(
      { error: "解析中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
