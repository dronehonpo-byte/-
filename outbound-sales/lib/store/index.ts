import type {
  Lead,
  DncEntry,
  Scenario,
  Campaign,
  CallLog,
} from "@/lib/types";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";

// データ層の抽象。Supabase 未設定時はインメモリのデモストアで動く(ドライラン用)。
export interface DataStore {
  // 営業リスト
  listLeads(orgId: string): Promise<Lead[]>;
  getLead(orgId: string, id: string): Promise<Lead | null>;
  createLead(orgId: string, data: Omit<Lead, "id" | "org_id" | "created_at" | "updated_at">): Promise<Lead>;
  createLeads(orgId: string, rows: Omit<Lead, "id" | "org_id" | "created_at" | "updated_at">[]): Promise<number>;
  updateLead(orgId: string, id: string, data: Partial<Lead>): Promise<Lead | null>;
  deleteLead(orgId: string, id: string): Promise<void>;

  // DNC(拒否リスト)
  listDnc(orgId: string): Promise<DncEntry[]>;
  isDnc(orgId: string, phone: string): Promise<boolean>;
  addDnc(orgId: string, data: Omit<DncEntry, "id" | "org_id" | "created_at">): Promise<DncEntry>;
  removeDnc(orgId: string, id: string): Promise<void>;

  // シナリオ
  listScenarios(orgId: string): Promise<Scenario[]>;
  getScenario(orgId: string, id: string): Promise<Scenario | null>;
  createScenario(orgId: string, data: Omit<Scenario, "id" | "org_id" | "created_at" | "updated_at">): Promise<Scenario>;
  updateScenario(orgId: string, id: string, data: Partial<Scenario>): Promise<Scenario | null>;
  deleteScenario(orgId: string, id: string): Promise<void>;

  // キャンペーン
  listCampaigns(orgId: string): Promise<Campaign[]>;
  getCampaign(orgId: string, id: string): Promise<Campaign | null>;
  createCampaign(orgId: string, data: Omit<Campaign, "id" | "org_id" | "created_at" | "updated_at">): Promise<Campaign>;
  updateCampaign(orgId: string, id: string, data: Partial<Campaign>): Promise<Campaign | null>;
  deleteCampaign(orgId: string, id: string): Promise<void>;

  // 架電結果
  listCallLogs(orgId: string): Promise<CallLog[]>;
  createCallLog(orgId: string, data: Omit<CallLog, "id" | "org_id" | "called_at">): Promise<CallLog>;
  updateCallLog(orgId: string, id: string, data: Partial<CallLog>): Promise<CallLog | null>;
}

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

declare global {
  // ホットリロード間でデモストアを維持する
  var __memoryStore: MemoryStore | undefined;
}

export function getStore(): DataStore {
  if (hasSupabase) return new SupabaseStore();
  if (!globalThis.__memoryStore) globalThis.__memoryStore = new MemoryStore();
  return globalThis.__memoryStore;
}

export function isDemoMode(): boolean {
  return !hasSupabase;
}
