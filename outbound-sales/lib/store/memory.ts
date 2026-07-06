import { randomUUID } from "crypto";
import type { Lead, DncEntry, Scenario, Campaign, CallLog } from "@/lib/types";
import type { DataStore } from "./index";

// Supabase 未設定時のインメモリ実装(ドライラン・デモ用)。
// マルチテナント境界(org_id での絞り込み)は本番と同じ流儀で守る。
export class MemoryStore implements DataStore {
  private leads: Lead[] = [];
  private dnc: DncEntry[] = [];
  private scenarios: Scenario[] = [];
  private campaigns: Campaign[] = [];
  private callLogs: CallLog[] = [];

  private now() {
    return new Date().toISOString();
  }

  // ---- Leads ----
  async listLeads(orgId: string) {
    return this.leads.filter((l) => l.org_id === orgId);
  }
  async getLead(orgId: string, id: string) {
    return this.leads.find((l) => l.org_id === orgId && l.id === id) ?? null;
  }
  async createLead(orgId: string, data: Omit<Lead, "id" | "org_id" | "created_at" | "updated_at">) {
    const lead: Lead = { ...data, id: randomUUID(), org_id: orgId, created_at: this.now(), updated_at: this.now() };
    this.leads.push(lead);
    return lead;
  }
  async createLeads(orgId: string, rows: Omit<Lead, "id" | "org_id" | "created_at" | "updated_at">[]) {
    for (const r of rows) await this.createLead(orgId, r);
    return rows.length;
  }
  async updateLead(orgId: string, id: string, data: Partial<Lead>) {
    const lead = await this.getLead(orgId, id);
    if (!lead) return null;
    Object.assign(lead, data, { id: lead.id, org_id: orgId, updated_at: this.now() });
    return lead;
  }
  async deleteLead(orgId: string, id: string) {
    this.leads = this.leads.filter((l) => !(l.org_id === orgId && l.id === id));
  }

  // ---- DNC ----
  async listDnc(orgId: string) {
    return this.dnc.filter((d) => d.org_id === orgId);
  }
  async isDnc(orgId: string, phone: string) {
    return this.dnc.some((d) => d.org_id === orgId && d.phone === phone);
  }
  async addDnc(orgId: string, data: Omit<DncEntry, "id" | "org_id" | "created_at">) {
    const existing = this.dnc.find((d) => d.org_id === orgId && d.phone === data.phone);
    if (existing) return existing;
    const entry: DncEntry = { ...data, id: randomUUID(), org_id: orgId, created_at: this.now() };
    this.dnc.push(entry);
    return entry;
  }
  async removeDnc(orgId: string, id: string) {
    this.dnc = this.dnc.filter((d) => !(d.org_id === orgId && d.id === id));
  }

  // ---- Scenarios ----
  async listScenarios(orgId: string) {
    return this.scenarios.filter((s) => s.org_id === orgId);
  }
  async getScenario(orgId: string, id: string) {
    return this.scenarios.find((s) => s.org_id === orgId && s.id === id) ?? null;
  }
  async createScenario(orgId: string, data: Omit<Scenario, "id" | "org_id" | "created_at" | "updated_at">) {
    const s: Scenario = { ...data, id: randomUUID(), org_id: orgId, created_at: this.now(), updated_at: this.now() };
    this.scenarios.push(s);
    return s;
  }
  async updateScenario(orgId: string, id: string, data: Partial<Scenario>) {
    const s = await this.getScenario(orgId, id);
    if (!s) return null;
    Object.assign(s, data, { id: s.id, org_id: orgId, updated_at: this.now() });
    return s;
  }
  async deleteScenario(orgId: string, id: string) {
    this.scenarios = this.scenarios.filter((s) => !(s.org_id === orgId && s.id === id));
  }

  // ---- Campaigns ----
  async listCampaigns(orgId: string) {
    return this.campaigns.filter((c) => c.org_id === orgId);
  }
  async getCampaign(orgId: string, id: string) {
    return this.campaigns.find((c) => c.org_id === orgId && c.id === id) ?? null;
  }
  async createCampaign(orgId: string, data: Omit<Campaign, "id" | "org_id" | "created_at" | "updated_at">) {
    const c: Campaign = { ...data, id: randomUUID(), org_id: orgId, created_at: this.now(), updated_at: this.now() };
    this.campaigns.push(c);
    return c;
  }
  async updateCampaign(orgId: string, id: string, data: Partial<Campaign>) {
    const c = await this.getCampaign(orgId, id);
    if (!c) return null;
    Object.assign(c, data, { id: c.id, org_id: orgId, updated_at: this.now() });
    return c;
  }
  async deleteCampaign(orgId: string, id: string) {
    this.campaigns = this.campaigns.filter((c) => !(c.org_id === orgId && c.id === id));
  }

  // ---- Call logs ----
  async listCallLogs(orgId: string) {
    return this.callLogs
      .filter((c) => c.org_id === orgId)
      .sort((a, b) => b.called_at.localeCompare(a.called_at));
  }
  async createCallLog(orgId: string, data: Omit<CallLog, "id" | "org_id" | "called_at">) {
    const log: CallLog = { ...data, id: randomUUID(), org_id: orgId, called_at: this.now() };
    this.callLogs.push(log);
    return log;
  }
  async updateCallLog(orgId: string, id: string, data: Partial<CallLog>) {
    const log = this.callLogs.find((c) => c.org_id === orgId && c.id === id) ?? null;
    if (!log) return null;
    Object.assign(log, data, { id: log.id, org_id: orgId });
    return log;
  }
}
