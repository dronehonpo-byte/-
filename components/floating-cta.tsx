"use client";

import * as React from "react";
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
        <div className="pointer-events-auto mx-auto max-w-3xl flex items-stretch gap-2 md:gap-3">
          {/* Primary: TimeRex */}
          <a
            href={ctaLinks.timerex}
            target="_blank"
            rel="noopener noreferrer"
            data-ga="floating_timerex"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-3 py-3.5 md:py-4 text-sm md:text-base font-bold shadow-[0_-4px_20px_-4px_rgba(15,26,58,0.18)] hover:bg-accent-700 transition-colors"
          >
            <Calendar size={18} />
            <span>無料相談を予約</span>
          </a>

          {/* Sub: LINE */}
          <a
            href={ctaLinks.line}
            target="_blank"
            rel="noopener noreferrer"
            data-ga="floating_line"
            aria-label="LINE登録"
            className="shrink-0 inline-flex items-center justify-center w-12 md:w-14 rounded-xl bg-navy-900 text-white border border-white/10 hover:bg-navy-800 transition-colors"
          >
            <MessageCircle size={20} className="text-[#06C755]" />
          </a>

          {/* Sub: Diagnosis */}
          <a
            href={ctaLinks.diagnosis}
            data-ga="floating_diagnosis"
            aria-label="30秒診断"
            className="shrink-0 inline-flex items-center justify-center w-12 md:w-14 rounded-xl bg-navy-900 text-white border border-white/10 hover:bg-navy-800 transition-colors"
          >
            <Sparkles size={20} className="text-accent" />
          </a>
        </div>
      </div>
    </div>
  );
}
