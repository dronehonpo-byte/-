import { NextRequest, NextResponse } from "next/server";

// Gemini Vision 解析プロキシ。APIキーはサーバー側(GEMINI_API_KEY)のみで保持し、
// クライアント(静的 /violin.html)には一切露出しない。

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "gemini-flash-latest";

function extractJson(t: string): string {
  t = (t || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return t;
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "サーバーに GEMINI_API_KEY が設定されていません。" },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string; mimeType?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { imageBase64, mimeType, prompt } = body;
  if (!imageBase64 || !prompt) {
    return NextResponse.json({ error: "画像データが不足しています。" }, { status: 400 });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": key },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      }
    );

    if (!r.ok) {
      let detail = "";
      try {
        detail = (await r.json())?.error?.message || "";
      } catch {}
      if (r.status === 429) {
        return NextResponse.json(
          { error: "APIの無料枠の上限に達しました。少し待ってから再度お試しください。" },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "解析に失敗しました。" + detail }, { status: 502 });
    }

    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.find((p: { text?: string }) => typeof p.text === "string")?.text;
    if (!text) {
      return NextResponse.json(
        { error: "解析結果を取得できませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    let analysis;
    try {
      analysis = JSON.parse(extractJson(text));
    } catch {
      return NextResponse.json(
        { error: "画像を読み取れませんでした。明るい環境で撮影してもう一度お試しください。" },
        { status: 422 }
      );
    }
    if (!analysis.notes || analysis.notes.length === 0) {
      return NextResponse.json(
        { error: "音符を検出できませんでした。楽譜がはっきり写っているか確認してください。" },
        { status: 422 }
      );
    }

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "解析中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
