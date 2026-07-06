"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import type { CallOutcome, InterestLevel } from "@/lib/types";

const outcomes: CallOutcome[] = ["appointment", "interested", "rejected", "no_answer"];
const interests = ["high", "medium", "low", "none"] as const;

// 架電結果の記録・更新。「拒否」を記録した番号は自動的にDNCへ登録し、
// 以後の再架電をシステムがブロックする。
export async function recordResultAction(logId: string, formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const store = getStore();

  const outcomeRaw = String(formData.get("outcome") ?? "");
  if (!outcomes.includes(outcomeRaw as CallOutcome)) return;
  const outcome = outcomeRaw as CallOutcome;

  const interestRaw = String(formData.get("interest_level") ?? "");
  const interest: InterestLevel = (interests as readonly string[]).includes(interestRaw)
    ? (interestRaw as InterestLevel)
    : null;

  const memo = String(formData.get("memo") ?? "").trim() || null;

  const log = await store.updateCallLog(orgId, logId, {
    outcome,
    interest_level: interest,
    memo,
  });
  if (!log) return;

  // リードのステータスを結果に追従させる
  if (log.lead_id) {
    const status =
      outcome === "appointment" ? "appointment"
      : outcome === "rejected" ? "dnc"
      : outcome === "interested" ? "connected"
      : "connected";
    await store.updateLead(orgId, log.lead_id, { status });
  }

  // 拒否 → DNC 自動登録(再架電ブロック)
  if (outcome === "rejected") {
    await store.addDnc(orgId, {
      phone: log.phone,
      reason: "架電時に勧誘停止のご意向(自動登録)",
      source: "call_result",
    });
  }

  revalidatePath("/calls");
  revalidatePath("/leads");
  revalidatePath("/dnc");
  revalidatePath("/");
}
