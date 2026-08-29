"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { normalizePhone } from "@/lib/phone";
import type { LeadStatus } from "@/lib/types";

export async function createLeadAction(formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const company = String(formData.get("company_name") ?? "").trim();
  if (!phone || !company) return;
  await getStore().createLead(orgId, {
    company_name: company,
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    phone,
    email: String(formData.get("email") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: "new",
  });
  revalidatePath("/leads");
}

export async function updateLeadStatusAction(id: string, status: LeadStatus): Promise<void> {
  const orgId = await getOrgId();
  await getStore().updateLead(orgId, id, { status });
  revalidatePath("/leads");
}

export async function deleteLeadAction(id: string): Promise<void> {
  const orgId = await getOrgId();
  await getStore().deleteLead(orgId, id);
  revalidatePath("/leads");
}

// CSVインポート。1行目がヘッダ(company_name,contact_name,phone,email,notes)の場合はスキップ。
// 列順は 会社名, 担当者, 電話番号, メール, メモ。電話番号が正規化できない行は取り込まない。
export async function importCsvAction(formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const rows: {
    company_name: string;
    contact_name: string | null;
    phone: string;
    email: string | null;
    notes: string | null;
    status: LeadStatus;
  }[] = [];
  for (const [i, line] of lines.entries()) {
    const cols = parseCsvLine(line);
    if (i === 0 && /company|会社/i.test(cols[0] ?? "")) continue;
    const phone = normalizePhone(cols[2] ?? "");
    const company = (cols[0] ?? "").trim();
    if (!phone || !company) continue;
    rows.push({
      company_name: company,
      contact_name: (cols[1] ?? "").trim() || null,
      phone,
      email: (cols[3] ?? "").trim() || null,
      notes: (cols[4] ?? "").trim() || null,
      status: "new",
    });
  }
  if (rows.length > 0) await getStore().createLeads(orgId, rows);
  revalidatePath("/leads");
}

// ダブルクォート対応の簡易CSVパーサ(1行分)
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
