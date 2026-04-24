"use client";

import * as React from "react";
import Link from "next/link";
import { Menu as MenuIcon, X } from "lucide-react";
import { ButtonLink } from "./ui/button";
import { ctaLinks } from "@/lib/config";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/#strengths", label: "強み" },
  { href: "/#menus", label: "メニュー" },
  { href: "/#pricing", label: "料金" },
  { href: "/#flow", label: "導入フロー" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/85 backdrop-blur border-b border-navy/5 shadow-sm"
          : "bg-transparent",
      )}
    >
      <div className="container flex h-16 md:h-20 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-en text-xl md:text-2xl tracking-[0.2em] font-bold text-navy"
          aria-label="KUHAKU ホーム"
        >
          <span className="text-gold">●</span>
          KUHAKU
        </Link>

        <nav className="hidden lg:flex items-center gap-8" aria-label="主要メニュー">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-navy/80 hover:text-navy transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ButtonLink
            href={ctaLinks.diagnosis}
            variant="outline"
            size="sm"
            data-ga="header_diagnosis"
          >
            30秒で診断
          </ButtonLink>
          <ButtonLink
            href={ctaLinks.timerex}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="sm"
            data-ga="header_timerex"
          >
            無料相談
          </ButtonLink>
        </div>

        <button
          type="button"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-navy/10 bg-white/95 backdrop-blur"
        >
          <nav className="container flex flex-col gap-1 py-4" aria-label="モバイルメニュー">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-navy/90 hover:bg-navy-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <ButtonLink
                href={ctaLinks.diagnosis}
                variant="outline"
                size="md"
                onClick={() => setOpen(false)}
              >
                30秒で診断
              </ButtonLink>
              <ButtonLink
                href={ctaLinks.timerex}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="md"
                onClick={() => setOpen(false)}
              >
                無料相談を予約
              </ButtonLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
