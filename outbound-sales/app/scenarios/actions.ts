"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";

export async function createScenarioAction(formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const name = String(formData.get("name") ?? "").trim();
  const productName = String(formData.get("product_name") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  // 事業者名と目的は特商法の冒頭名乗りに必須のため空を許さない
  if (!name || !productName || !businessName || !purpose) return;
  await getStore().createScenario(orgId, {
    name,
    product_name: productName,
    business_name: businessName,
    purpose,
    talk_flow: String(formData.get("talk_flow") ?? "").trim(),
    objection_handling: String(formData.get("objection_handling") ?? "").trim(),
  });
  revalidatePath("/scenarios");
}

export async function updateScenarioAction(id: string, formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  if (!businessName || !purpose) return;
  await getStore().updateScenario(orgId, id, {
    name: String(formData.get("name") ?? "").trim(),
    product_name: String(formData.get("product_name") ?? "").trim(),
    business_name: businessName,
    purpose,
    talk_flow: String(formData.get("talk_flow") ?? "").trim(),
    objection_handling: String(formData.get("objection_handling") ?? "").trim(),
  });
  revalidatePath("/scenarios");
  revalidatePath(`/scenarios/${id}`);
}

export async function deleteScenarioAction(id: string): Promise<void> {
  const orgId = await getOrgId();
  await getStore().deleteScenario(orgId, id);
  revalidatePath("/scenarios");
}
