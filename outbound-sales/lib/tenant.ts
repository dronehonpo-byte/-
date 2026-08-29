import { auth } from "@clerk/nextjs/server";

const hasClerk =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

// テナント = Clerk の組織(orgId)。個人利用時は userId をテナントとして扱う。
// Clerk 未設定のローカルドライラン時は固定のデモテナント。
export async function getOrgId(): Promise<string> {
  if (!hasClerk) return "demo-org";
  const { orgId, userId } = await auth();
  const tenant = orgId ?? userId;
  if (!tenant) throw new Error("未認証です。サインインしてください。");
  return tenant;
}
