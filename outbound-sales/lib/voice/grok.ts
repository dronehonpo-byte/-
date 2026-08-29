// Grok Voice(xAI)SIP 発信コネクタ。
// XAI_API_KEY と GROK_VOICE_SIP_TRUNK_URI が揃っている場合のみ実発信、
// それ以外は常にドライラン(実際にかけずログのみ)で動作する。

export interface DialRequest {
  phone: string; // E.164
  callerId: string | null;
  // コンプライアンス指示込みのエージェント指示(lib/compliance の buildAgentInstructions で生成)
  agentInstructions: string;
}

export interface DialResult {
  dryRun: boolean;
  callId: string | null;
  status: "queued" | "dry_run" | "failed";
  detail: string;
}

export function isVoiceConfigured(): boolean {
  return !!process.env.XAI_API_KEY && !!process.env.GROK_VOICE_SIP_TRUNK_URI;
}

export async function dial(req: DialRequest): Promise<DialResult> {
  if (!isVoiceConfigured()) {
    console.info(
      `[voice:dry-run] 発信シミュレーション to=${req.phone} caller=${req.callerId ?? "(未設定)"} ` +
        `instructions=${req.agentInstructions.length}文字`
    );
    return {
      dryRun: true,
      callId: null,
      status: "dry_run",
      detail: "SIP未設定のためドライラン実行(実発信なし)。",
    };
  }

  // 実発信: SIP トランク経由で Grok Voice エージェントに発信させる。
  // 実回線は SIP 契約後に有効化されるため、ここは接続口のみ用意しておく。
  try {
    const res = await fetch("https://api.x.ai/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sip: {
          trunk_uri: process.env.GROK_VOICE_SIP_TRUNK_URI,
          username: process.env.GROK_VOICE_SIP_USERNAME,
          password: process.env.GROK_VOICE_SIP_PASSWORD,
        },
        to: req.phone,
        from: req.callerId,
        instructions: req.agentInstructions,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { dryRun: false, callId: null, status: "failed", detail: `発信APIエラー: ${res.status} ${body}` };
    }
    const data = (await res.json()) as { id?: string };
    return { dryRun: false, callId: data.id ?? null, status: "queued", detail: "発信をキューに登録しました。" };
  } catch (e) {
    return { dryRun: false, callId: null, status: "failed", detail: `発信に失敗しました: ${String(e)}` };
  }
}
