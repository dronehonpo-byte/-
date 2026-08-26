/**
 * 認識サービスの公開URLを返すだけの軽量API。
 *
 * ブラウザは重い認識を「サービスへ直接」送る（Vercelの関数タイムアウト回避）。
 * そのためにサービスURLをクライアントへ渡す必要があるが、URLは秘密ではないので
 * サーバー側 env OMR_SERVICE_URL をそのまま返す（新しい環境変数の追加は不要）。
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.OMR_SERVICE_URL;
  if (!url) {
    return NextResponse.json(
      {
        error:
          "OMR_SERVICE_URL が未設定です。OSS楽譜認識サービス（Audiveris）のURLを環境変数に設定してください。",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ url: url.replace(/\/$/, "") });
}
