"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { normalizePhone } from "@/lib/phone";

export async function addDncAction(formData: FormData): Promise<void> {
  const orgId = await getOrgId();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return;
  await getStore().addDnc(orgId, {
    phone,
    reason: String(formData.get("reason") ?? "").trim() || null,
    source: "manual",
  });
  revalidatePath("/dnc");
}

// DNC解除は誤登録の訂正用。安易な解除で法令違反にならないよう画面側で注意書きを出す。
export async function removeDncAction(id: string): Promise<void> {
  const orgId = await getOrgId();
  await getStore().removeDnc(orgId, id);
  revalidatePath("/dnc");
}
