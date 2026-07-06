import { getStore } from "@/lib/store";
import type { Scenario } from "@/lib/types";

// ===== 法令遵守ガードレール(特定商取引法・電話勧誘販売ルール) =====

export type CallBlockReason = "dnc" | "outside_hours";

export interface CallPermission {
  allowed: boolean;
  reason: CallBlockReason | null;
  detail: string;
}

// 架電許可時間帯(JST)。デフォルト 9:00〜20:00。
function callingHours(): { start: number; end: number } {
  const start = Number(process.env.CALLING_HOURS_START ?? 9);
  const end = Number(process.env.CALLING_HOURS_END ?? 20);
  return { start, end };
}

export function isWithinCallingHours(now: Date = new Date()): boolean {
  const { start, end } = callingHours();
  const jstHour = Number(
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(now)
  );
  return jstHour >= start && jstHour < end;
}

// 発信前チェック。DNC登録済み or 時間帯外なら発信をブロックする。
// このチェックは発信経路(lib/voice)の唯一の入口で必ず通る。
export async function checkCallPermission(orgId: string, phone: string): Promise<CallPermission> {
  if (await getStore().isDnc(orgId, phone)) {
    return {
      allowed: false,
      reason: "dnc",
      detail: `この番号(${phone})は拒否リスト(DNC)に登録されているため発信できません。`,
    };
  }
  if (!isWithinCallingHours()) {
    const { start, end } = callingHours();
    return {
      allowed: false,
      reason: "outside_hours",
      detail: `架電可能時間帯(JST ${start}時〜${end}時)の範囲外のため発信できません。`,
    };
  }
  return { allowed: true, reason: null, detail: "発信可能です。" };
}

// 通話冒頭の名乗りスクリプト(特商法: 事業者名・勧誘目的の明示)。
// シナリオ本文の前に必ずこの文言を挿入し、AIには省略・変更を禁じる。
export function buildMandatoryOpening(scenario: Pick<Scenario, "business_name" | "purpose" | "product_name">): string {
  return [
    `お世話になっております。${scenario.business_name}と申します。`,
    `本日は${scenario.product_name}のご案内(${scenario.purpose})でお電話いたしました。`,
    `品質向上のため、この通話は録音させていただいております。`,
  ].join("\n");
}

// AI音声エージェントへ渡すシステム指示(コンプライアンス指示を強制的に前置)
export function buildAgentInstructions(scenario: Scenario): string {
  return [
    "あなたは電話営業を行うAIアシスタントです。以下のルールを厳守してください。",
    "",
    "【法令遵守ルール(絶対に省略・変更しないこと)】",
    "1. 通話の冒頭で、必ず次の名乗りをそのまま読み上げること:",
    buildMandatoryOpening(scenario)
      .split("\n")
      .map((l) => `   ${l}`)
      .join("\n"),
    "2. 相手が「不要」「断る」「かけてこないで」等の意思を示したら、直ちに勧誘を中止し、丁重に謝罪して通話を終了すること。再勧誘は禁止。",
    "3. 契約を急がせる、事実と異なる説明をする、威迫的な言動をとることは禁止。",
    "4. 相手から社名・目的・連絡先を尋ねられたら正確に答えること。",
    "",
    "【商材】",
    scenario.product_name,
    "",
    "【トークフロー】",
    scenario.talk_flow,
    "",
    "【切り返し(想定問答)】",
    scenario.objection_handling,
  ].join("\n");
}
