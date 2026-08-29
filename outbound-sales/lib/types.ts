// ドメイン型定義(マルチテナント: 全レコードが org_id を持つ)

export type LeadStatus = "new" | "calling" | "connected" | "appointment" | "rejected" | "dnc";

export interface Lead {
  id: string;
  org_id: string;
  company_name: string;
  contact_name: string | null;
  phone: string; // E.164 正規化済み
  email: string | null;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export type DncSource = "manual" | "call_result" | "import";

export interface DncEntry {
  id: string;
  org_id: string;
  phone: string; // E.164 正規化済み
  reason: string | null;
  source: DncSource;
  created_at: string;
}

export interface Scenario {
  id: string;
  org_id: string;
  name: string;
  product_name: string; // 商材名
  // 通話冒頭で必ず名乗る事業者名(特商法対応・スクリプトに強制挿入)
  business_name: string;
  purpose: string; // 通話の目的(冒頭で必ず告げる)
  talk_flow: string; // メイントークフロー
  objection_handling: string; // 切り返し集
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed";

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  scenario_id: string;
  lead_ids: string[];
  status: CampaignStatus;
  scheduled_at: string | null; // 開始予定日時
  created_at: string;
  updated_at: string;
}

export type CallOutcome =
  | "appointment" // アポ獲得
  | "interested" // 興味あり
  | "rejected" // 拒否
  | "no_answer" // 不在
  | "blocked_dnc" // DNCによりブロック
  | "blocked_hours" // 時間帯制限によりブロック
  | "dry_run"; // ドライラン

export type InterestLevel = "high" | "medium" | "low" | "none" | null;

export interface CallLog {
  id: string;
  org_id: string;
  campaign_id: string | null;
  lead_id: string | null;
  phone: string;
  outcome: CallOutcome;
  interest_level: InterestLevel;
  // コンプライアンス記録
  recording_url: string | null;
  recording_consent: boolean; // 録音の同意
  disclosed_identity: boolean; // 冒頭で事業者名・目的を名乗ったか
  memo: string | null;
  dry_run: boolean;
  called_at: string;
}

export interface DashboardStats {
  totalCalls: number;
  connectedCalls: number;
  appointments: number;
  connectRate: number; // 接続率
  appointmentRate: number; // アポ率
  interestDistribution: Record<string, number>;
  blockedByDnc: number;
  blockedByHours: number;
}
