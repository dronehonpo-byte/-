import type { LeadStatus, CallOutcome, CampaignStatus, InterestLevel } from "@/lib/types";

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "未架電",
  calling: "架電中",
  connected: "接続済み",
  appointment: "アポ獲得",
  rejected: "拒否",
  dnc: "DNC登録済み",
};

export const outcomeLabels: Record<CallOutcome, string> = {
  appointment: "アポ獲得",
  interested: "興味あり",
  rejected: "拒否",
  no_answer: "不在",
  blocked_dnc: "DNCブロック",
  blocked_hours: "時間帯ブロック",
  dry_run: "ドライラン",
};

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  running: "実行中",
  paused: "一時停止",
  completed: "完了",
};

export const interestLabels: Record<Exclude<InterestLevel, null>, string> = {
  high: "高",
  medium: "中",
  low: "低",
  none: "なし",
};
