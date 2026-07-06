import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIアウトバウンド営業",
  description: "AIが架電し、アポ獲得・興味度判定・フォローアップまで管理する営業SaaS",
};

const hasClerk =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

const nav = [
  { href: "/", label: "ダッシュボード" },
  { href: "/leads", label: "営業リスト" },
  { href: "/dnc", label: "拒否リスト(DNC)" },
  { href: "/scenarios", label: "トークシナリオ" },
  { href: "/campaigns", label: "キャンペーン" },
  { href: "/calls", label: "架電結果" },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white p-4">
            <div className="mb-6 px-2">
              <div className="text-lg font-bold">AI営業コール</div>
              <div className="text-xs text-neutral-500">Outbound Sales AI</div>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {!hasClerk && (
              <div className="mt-6 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                デモモード(Clerk/Supabase未設定)。データはメモリ上のみ、発信はドライラン。
              </div>
            )}
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (!hasClerk) return <Shell>{children}</Shell>;
  return (
    <ClerkProvider localization={jaJP}>
      <Shell>{children}</Shell>
    </ClerkProvider>
  );
}
