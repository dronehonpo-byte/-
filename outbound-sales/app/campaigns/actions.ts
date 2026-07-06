"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { checkCallPermission, buildAgentInstructions } from "@/lib/compliance";
import { dial } from "@/lib/voice/grok";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const name = String(formData.get("name") ?? "").trim();
  const scenarioId = String(formData.get("scenario_id") ?? "");
  const leadIds = formData.getAll("lead_ids").map(String);
  if (!name || !scenarioId || leadIds.length === 0) return;
  const scheduledAtRaw = String(formData.get("scheduled_at") ?? "").trim();
  await getStore().createCampaign(orgId, {
    name,
    scenario_id: scenarioId,
    lead_ids: leadIds,
    status: scheduledAtRaw ? "scheduled" : "draft",
    scheduled_at: scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null,
  });
  revalidatePath("/campaigns");
}

export async function deleteCampaignAction(id: string): Promise<void> {
  const orgId = await getOrgId();
  await getStore().deleteCampaign(orgId, id);
  revalidatePath("/campaigns");
}

// キャンペーン実行: 対象リード全員に対して
// 発信前コンプライアンスチェック(DNC・時間帯)→ 発信(未設定ならドライラン)→ 結果記録。
export async function runCampaignAction(id: string): Promise<void> {
  const orgId = await getOrgId();
  const store = getStore();
  const campaign = await store.getCampaign(orgId, id);
  if (!campaign) return;
  const scenario = await store.getScenario(orgId, campaign.scenario_id);
  if (!scenario) return;

  await store.updateCampaign(orgId, id, { status: "running" });

  const callerId = process.env.OUTBOUND_CALLER_ID ?? null;
  const instructions = buildAgentInstructions(scenario);

  for (const leadId of campaign.lead_ids) {
    const lead = await store.getLead(orgId, leadId);
    if (!lead) continue;

    // 発信前ガードレール: DNC・架電時間帯を必ずチェック
    const permission = await checkCallPermission(orgId, lead.phone);
    if (!permission.allowed) {
      await store.createCallLog(orgId, {
        campaign_id: id,
        lead_id: leadId,
        phone: lead.phone,
        outcome: permission.reason === "dnc" ? "blocked_dnc" : "blocked_hours",
        interest_level: null,
        recording_url: null,
        recording_consent: false,
        disclosed_identity: false,
        memo: permission.detail,
        dry_run: false,
      });
      continue;
    }

    const result = await dial({ phone: lead.phone, callerId, agentInstructions: instructions });
    await store.createCallLog(orgId, {
      campaign_id: id,
      lead_id: leadId,
      phone: lead.phone,
      outcome: result.dryRun ? "dry_run" : "no_answer", // 実発信の結果は通話終了後に更新する
      interest_level: null,
      recording_url: null,
      recording_consent: true, // 冒頭スクリプトで録音を告知(同意記録)
      disclosed_identity: true, // 冒頭名乗りはシステムが強制挿入
      memo: result.detail,
      dry_run: result.dryRun,
    });
    await store.updateLead(orgId, leadId, { status: "calling" });
  }

  await store.updateCampaign(orgId, id, { status: "completed" });
  revalidatePath("/campaigns");
  revalidatePath("/calls");
  revalidatePath("/leads");
  revalidatePath("/");
}
