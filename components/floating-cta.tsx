"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, MessageCircle, Sparkles } from "lucide-react";
import { ctaLinks } from "@/lib/config";
import { cn } from "@/lib/utils";

export function FloatingCTA() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 pointer-events-none transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <div className="container pb-3 md:pb-4">
        <div className="pointer-events-auto mx-auto max-w-4xl rounded-xl bg-navy-900 text-white border border-white/10 overflow-hidden shadow-[0_-4px_20px_-4px_rgba(15,26,58,0.18)]">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            <a
              href={ctaLinks.timerex}
              target="_blank"
              rel="noopener noreferrer"
              data-ga="floating_timerex"
              className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-bold hover:bg-white/5 transition"
            >
              <Calendar size={18} className="text-white" />
              <span>無料相談</span>
            </a>
            <a
              href={ctaLinks.line}
              target="_blank"
              rel="noopener noreferrer"
              data-ga="floating_line"
              className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-bold hover:bg-white/5 transition"
            >
              <MessageCircle size={18} className="text-[#06C755]" />
              <span>LINE登録</span>
            </a>
            <Link
              href={ctaLinks.diagnosis}
              data-ga="floating_diagnosis"
              className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-bold bg-accent text-white hover:bg-accent-700 transition-colors"
            >
              <Sparkles size={18} />
              <span>AI診断</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
