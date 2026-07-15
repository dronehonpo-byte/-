/**
 * OMR API ルート（OSS版）
 *
 * 旧: 外部の Vision API（従量課金）へ画像を送って構造化JSONを得ていた。
 * 新: OSS の楽譜認識サービス（Audiveris をコンテナ化したもの）へスキャンを転送し、
 *     返ってきた **MusicXML** を Note[] へ変換して返す。外部AI APIは使用しない。
 *
 * 認識サービスの場所は環境変数 OMR_SERVICE_URL で指定（例: Cloud Run のURL）。
 * このルート自体は軽い転送＋変換のみ。重い認識処理はコンテナ側で実行される。
 */

import { NextRequest, NextResponse } from "next/server";
import { parseMusicXml } from "@/lib/musicXml";
import type { ScoreAnalysis } from "@/types/score";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 認識サービスの返却契約 */
interface OmrServiceResponse {
  /** Audiveris が出力した MusicXML 文字列 */
  musicXml?: string;
  /** サービスが処理したページ画像のピクセル寸法（座標換算の基準） */
  width?: number;
  height?: number;
  /** サービス側エラー */
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const serviceUrl = process.env.OMR_SERVICE_URL;
    if (!serviceUrl) {
      return NextResponse.json(
        {
          error:
            "OMR_SERVICE_URL が未設定です。OSS楽譜認識サービス（Audiveris）のURLを環境変数に設定してください（.env.example / services/omr/README.md 参照）。",
        },
        { status: 500 },
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "スキャンデータの受信に失敗しました。" }, { status: 400 });
    }

    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ファイルがありません。" }, { status: 400 });
    }

    // クライアントが把握しているピクセル寸法（サービスが返さない場合のフォールバック）
    const postedWidth = Number(form.get("width") ?? 0);
    const postedHeight = Number(form.get("height") ?? 0);

    // 認識サービスへ転送
    let service: OmrServiceResponse;
    try {
      const forward = new FormData();
      forward.append("file", file, file.name || "score");
      const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/omr`, {
        method: "POST",
        body: forward,
      });
      const raw = await res.text();
      try {
        service = JSON.parse(raw) as OmrServiceResponse;
      } catch {
        const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 200);
        throw new Error(`認識サービスの応答が不正です（HTTP ${res.status}）: ${snippet || "(空)"}`);
      }
      if (!res.ok) {
        throw new Error(service.error || `認識サービスがエラーを返しました（HTTP ${res.status}）。`);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `楽譜認識サービスの呼び出しに失敗しました: ${detail}` },
        { status: 502 },
      );
    }

    if (!service.musicXml) {
      return NextResponse.json(
        { error: "認識サービスから MusicXML が返りませんでした。" },
        { status: 502 },
      );
    }

    const imageWidth = service.width || postedWidth || 0;
    const imageHeight = service.height || postedHeight || 0;

    let analysis: ScoreAnalysis;
    try {
      analysis = parseMusicXml(service.musicXml, { imageWidth, imageHeight });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `MusicXML の変換に失敗しました: ${detail}` },
        { status: 502 },
      );
    }

    if (analysis.notes.length === 0) {
      return NextResponse.json(
        { error: "音符を検出できませんでした。スキャン品質（傾き・影・解像度）をご確認ください。" },
        { status: 422 },
      );
    }

    return NextResponse.json(analysis);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `サーバー内部エラー: ${detail}` }, { status: 500 });
  }
}
