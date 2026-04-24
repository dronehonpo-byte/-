"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, GraduationCap } from "lucide-react";
import { ButtonLink } from "../ui/button";
import { ctaLinks } from "@/lib/config";

const badges = [
  { icon: ShieldCheck, label: "完全成果報酬", sub: "50/50モデル" },
  { icon: Sparkles, label: "全額返金保証", sub: "基準未達なら全額" },
  { icon: GraduationCap, label: "慶應生社長のAIチーム", sub: "Claude Code活用" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-36 pb-20 md:pb-28">
      <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
      <div
        className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-navy/10 blur-3xl"
        aria-hidden
      />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white/80 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-navy/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            AI × 業務自動化 for SMB
          </div>

          <h1 className="heading-xl mt-6 text-[32px] leading-[1.25] md:text-6xl lg:text-[72px] lg:leading-[1.15]">
            月<span className="text-gold">40時間</span>を、
            <br className="md:hidden" />
            AIが返します。
          </h1>

          <p className="mt-6 md:mt-8 text-jp text-sm md:text-lg text-navy/80 max-w-2xl mx-auto">
            社長がやるべきでない業務を、AIで自動化。
            <br className="hidden md:inline" />
            削減時間を事前に約束し、達成できなければ
            <span className="font-bold text-navy">全額返金</span>
            します。
          </p>

          {/* 信頼バッジ */}
          <div className="mt-8 md:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {badges.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                className="flex items-center justify-center gap-2 rounded-xl border border-navy/10 bg-white/70 px-3 py-3 backdrop-blur shadow-soft"
              >
                <b.icon size={18} className="text-gold shrink-0" />
                <div className="text-left leading-tight">
                  <div className="text-xs md:text-sm font-bold text-navy">
                    {b.label}
                  </div>
                  <div className="text-[10px] md:text-xs text-navy/60">
                    {b.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 md:mt-12 flex flex-col items-center gap-3">
            <ButtonLink
              href={ctaLinks.diagnosis}
              variant="primary"
              size="xl"
              data-ga="hero_diagnosis"
              className="w-full sm:w-auto"
            >
              <Sparkles size={20} />
              30秒で診断｜あなたの会社、月何時間削減できる？
            </ButtonLink>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <a
                href={ctaLinks.line}
                target="_blank"
                rel="noopener noreferrer"
                data-ga="hero_line"
                className="text-sm font-bold text-navy/80 underline underline-offset-4 decoration-navy/30 hover:text-navy hover:decoration-gold transition"
              >
                💚 LINE登録で特典を受け取る
              </a>
              <span className="hidden sm:inline text-navy/30">｜</span>
              <a
                href={ctaLinks.timerex}
                target="_blank"
                rel="noopener noreferrer"
                data-ga="hero_timerex"
                className="text-sm font-bold text-navy/80 underline underline-offset-4 decoration-navy/30 hover:text-navy hover:decoration-gold transition"
              >
                📅 無料面談を予約（TimeRex）
              </a>
            </div>
          </div>
        </motion.div>

        {/* KPI帯 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 md:mt-24 mx-auto max-w-4xl grid grid-cols-3 divide-x divide-navy/10 rounded-2xl bg-white/70 backdrop-blur border border-navy/10 shadow-soft"
        >
          {[
            { big: "10万円", small: "から始められる" },
            { big: "50/50", small: "完全成果報酬モデル" },
            { big: "全額", small: "基準未達なら返金" },
          ].map((k) => (
            <div key={k.big} className="py-5 md:py-7 px-3 text-center">
              <div className="text-xl md:text-3xl font-bold text-navy font-en tracking-tight">
                {k.big}
              </div>
              <div className="mt-1 text-[10px] md:text-xs text-navy/60">
                {k.small}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
