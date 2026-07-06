import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Lead, DncEntry, Scenario, Campaign, CallLog } from "@/lib/types";
import type { DataStore } from "./index";

// サーバー専用。service_role を使うため、全クエリで org_id を必ず指定する
// (RLS はアプリ外からのアクセスと anon キー経路の防波堤として二重に効く)。
function client(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class SupabaseStore implements DataStore {
  private db = client();

  // ---- Leads ----
  async listLeads(orgId: string): Promise<Lead[]> {
    const { data, error } = await this.db
      .from("leads").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    throwIf(error);
    return data as Lead[];
  }
  async getLead(orgId: string, id: string): Promise<Lead | null> {
    const { data } = await this.db
      .from("leads").select("*").eq("org_id", orgId).eq("id", id).maybeSingle();
    return (data as Lead) ?? null;
  }
  async createLead(orgId: string, row: Omit<Lead, "id" | "org_id" | "created_at" | "updated_at">): Promise<Lead> {
    const { data, error } = await this.db
      .from("leads").insert({ ...row, org_id: orgId }).select().single();
    throwIf(error);
    return data as Lead;
  }
  async createLeads(orgId: string, rows: Omit<Lead, "id" | "org_id" | "created_at" | "updated_at">[]): Promise<number> {
    if (rows.length === 0) return 0;
    const { error, count } = await this.db
      .from("leads")
      .insert(rows.map((r) => ({ ...r, org_id: orgId })), { count: "exact" });
    throwIf(error);
    return count ?? rows.length;
  }
  async updateLead(orgId: string, id: string, row: Partial<Lead>): Promise<Lead | null> {
    const { data, error } = await this.db
      .from("leads").update({ ...row, updated_at: new Date().toISOString() })
      .eq("org_id", orgId).eq("id", id).select().maybeSingle();
    throwIf(error);
    return (data as Lead) ?? null;
  }
  async deleteLead(orgId: string, id: string): Promise<void> {
    const { error } = await this.db.from("leads").delete().eq("org_id", orgId).eq("id", id);
    throwIf(error);
  }

  // ---- DNC ----
  async listDnc(orgId: string): Promise<DncEntry[]> {
    const { data, error } = await this.db
      .from("dnc_entries").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    throwIf(error);
    return data as DncEntry[];
  }
  async isDnc(orgId: string, phone: string): Promise<boolean> {
    const { count, error } = await this.db
      .from("dnc_entries").select("id", { count: "exact", head: true })
      .eq("org_id", orgId).eq("phone", phone);
    throwIf(error);
    return (count ?? 0) > 0;
  }
  async addDnc(orgId: string, row: Omit<DncEntry, "id" | "org_id" | "created_at">): Promise<DncEntry> {
    const { data, error } = await this.db
      .from("dnc_entries")
      .upsert({ ...row, org_id: orgId }, { onConflict: "org_id,phone" })
      .select().single();
    throwIf(error);
    return data as DncEntry;
  }
  async removeDnc(orgId: string, id: string): Promise<void> {
    const { error } = await this.db.from("dnc_entries").delete().eq("org_id", orgId).eq("id", id);
    throwIf(error);
  }

  // ---- Scenarios ----
  async listScenarios(orgId: string): Promise<Scenario[]> {
    const { data, error } = await this.db
      .from("scenarios").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    throwIf(error);
    return data as Scenario[];
  }
  async getScenario(orgId: string, id: string): Promise<Scenario | null> {
    const { data } = await this.db
      .from("scenarios").select("*").eq("org_id", orgId).eq("id", id).maybeSingle();
    return (data as Scenario) ?? null;
  }
  async createScenario(orgId: string, row: Omit<Scenario, "id" | "org_id" | "created_at" | "updated_at">): Promise<Scenario> {
    const { data, error } = await this.db
      .from("scenarios").insert({ ...row, org_id: orgId }).select().single();
    throwIf(error);
    return data as Scenario;
  }
  async updateScenario(orgId: string, id: string, row: Partial<Scenario>): Promise<Scenario | null> {
    const { data, error } = await this.db
      .from("scenarios").update({ ...row, updated_at: new Date().toISOString() })
      .eq("org_id", orgId).eq("id", id).select().maybeSingle();
    throwIf(error);
    return (data as Scenario) ?? null;
  }
  async deleteScenario(orgId: string, id: string): Promise<void> {
    const { error } = await this.db.from("scenarios").delete().eq("org_id", orgId).eq("id", id);
    throwIf(error);
  }

  // ---- Campaigns ----
  async listCampaigns(orgId: string): Promise<Campaign[]> {
    const { data, error } = await this.db
      .from("campaigns").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    throwIf(error);
    return data as Campaign[];
  }
  async getCampaign(orgId: string, id: string): Promise<Campaign | null> {
    const { data } = await this.db
      .from("campaigns").select("*").eq("org_id", orgId).eq("id", id).maybeSingle();
    return (data as Campaign) ?? null;
  }
  async createCampaign(orgId: string, row: Omit<Campaign, "id" | "org_id" | "created_at" | "updated_at">): Promise<Campaign> {
    const { data, error } = await this.db
      .from("campaigns").insert({ ...row, org_id: orgId }).select().single();
    throwIf(error);
    return data as Campaign;
  }
  async updateCampaign(orgId: string, id: string, row: Partial<Campaign>): Promise<Campaign | null> {
    const { data, error } = await this.db
      .from("campaigns").update({ ...row, updated_at: new Date().toISOString() })
      .eq("org_id", orgId).eq("id", id).select().maybeSingle();
    throwIf(error);
    return (data as Campaign) ?? null;
  }
  async deleteCampaign(orgId: string, id: string): Promise<void> {
    const { error } = await this.db.from("campaigns").delete().eq("org_id", orgId).eq("id", id);
    throwIf(error);
  }

  // ---- Call logs ----
  async listCallLogs(orgId: string): Promise<CallLog[]> {
    const { data, error } = await this.db
      .from("call_logs").select("*").eq("org_id", orgId).order("called_at", { ascending: false });
    throwIf(error);
    return data as CallLog[];
  }
  async createCallLog(orgId: string, row: Omit<CallLog, "id" | "org_id" | "called_at">): Promise<CallLog> {
    const { data, error } = await this.db
      .from("call_logs").insert({ ...row, org_id: orgId }).select().single();
    throwIf(error);
    return data as CallLog;
  }
  async updateCallLog(orgId: string, id: string, row: Partial<CallLog>): Promise<CallLog | null> {
    const { data, error } = await this.db
      .from("call_logs").update(row).eq("org_id", orgId).eq("id", id).select().maybeSingle();
    throwIf(error);
    return (data as CallLog) ?? null;
  }
}
