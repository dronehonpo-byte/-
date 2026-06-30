import html from "./content.html";

// 静的HTMLアプリ（Gemini版）を /violin で配信。
// public/ 静的配信に依存せず、ルートハンドラとして確実に返す。

export const dynamic = "force-static";

export function GET() {
  return new Response(html as unknown as string, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
