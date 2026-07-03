"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneIncoming } from "lucide-react";

import { cn } from "@/lib/utils";
import { navItems } from "@/components/sidebar-nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-screen w-64 flex-col border-r">
      {/* ブランドロゴ */}
      <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-6">
        <span className="bg-brand-gold text-brand-navy flex size-8 items-center justify-center rounded-md">
          <PhoneIncoming className="size-5" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sidebar-primary text-lg font-bold tracking-wide">
            UKERU
          </span>
          <span className="text-sidebar-foreground/60 text-[10px] tracking-wider">
            AI CALL CENTER
          </span>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4.5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* フッター */}
      <div className="border-sidebar-border border-t px-6 py-4">
        <p className="text-sidebar-foreground/50 text-xs">
          © 2026 UKERU Inc.
        </p>
      </div>
    </aside>
  );
}
