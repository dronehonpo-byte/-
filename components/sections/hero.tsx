"use client";

import { motion } from "framer-motion";
import { ShieldCheck, RefreshCw, Wrench, Sparkles } from "lucide-react";
import { ButtonLink } from "../ui/button";
import { ctaLinks } from "@/lib/config";
import { catchphrases, trustBadges } from "@/lib/content";

const badgeIcons = [ShieldCheck, RefreshCw, Wrench];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-36 pb-20 md:pb-28">
      <div className="absolute inset-0 bg-dots opacity-50" aria-hidden />
      <div
        className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-vermilion/10 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-navy/10 blur-3xl"
        aria-hidden
      />

      <div className="container relative grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white/80 px-4 py-1.5 text-xs font-bold tracking-[0.18em] text-navy/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-vermilion" />
            中小企業のAI業務代行サービス
          </div>

          <h1 className="heading-xl mt-6 text-[34px] leading-[1.2] md:text-6xl lg:text-[68px] lg:leading-[1.15] font-bold">
            あなたの会社に、
            <br />
            <span className="text-vermilion">AI社員</span>を。
          </h1>

          <p className="mt-6 md:mt-8 text-jp text-base md:text-lg text-navy/85 leading-relaxed">
            24時間働き、文句を言わず、ミスをしない。
            <br className="hidden md:inline" />
            <span className="font-bold">
              メールも議事録もレポートも、AI社員に任せる。
            </span>
          </p>

          {/* 信頼バッジ */}
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {trustBadges.map((b, i) => {
              const Icon = badgeIcons[i] ?? ShieldCheck;
              return (
                <motion.li
                  key={b.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-navy/10 bg-white/70 px-3 py-3 backdrop-blur shadow-soft"
                >
                  <Icon size={20} className="text-vermilion shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="text-xs md:text-sm font-bold text-navy">
                      {b.label}
                    </div>
                    <div className="text-[10px] md:text-xs text-navy/60">
                      {b.detail}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          {/* CTA */}
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3">
            <ButtonLink
              href={ctaLinks.timerex}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="xl"
              data-ga="hero_timerex"
              className="w-full sm:w-auto"
            >
              30分で無料相談する
            </ButtonLink>
            <ButtonLink
              href={ctaLinks.diagnosis}
              variant="outline"
              size="xl"
              data-ga="hero_diagnosis"
              className="w-full sm:w-auto"
            >
              <Sparkles size={18} />
              30秒でAI診断する
            </ButtonLink>
          </div>

          <p className="mt-4 text-[11px] md:text-xs text-navy/50">
            ※ 平均月100時間削減は、従業員規模・選択業務に基づくAI診断の試算値です
          </p>
        </motion.div>

        {/* 右側ビジュアル：ダッシュボード風 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative order-first lg:order-last"
        >
          <DashboardMock />
        </motion.div>
      </div>

      {/* キャッチコピーE（ヒーローサブ） */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="container mt-16 md:mt-20"
      >
        <div className="border-t border-navy/10 pt-8 md:pt-10">
          <p className="text-center text-xl md:text-3xl font-bold tracking-wider text-navy/80">
            <span className="text-vermilion">{catchphrases.delegate}</span>
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-navy blur-2xl opacity-20" aria-hidden />
      <div className="rounded-2xl bg-white border border-navy/10 shadow-card overflow-hidden">
        {/* ヘッダ */}
        <div className="flex items-center justify-between bg-navy text-white px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-vermilion/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
          </div>
          <div className="text-[11px] font-en tracking-widest opacity-80">
            KUHAKU DASHBOARD
          </div>
          <div className="text-[10px] opacity-60">Live</div>
        </div>

        <div className="p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="削減時間 / 月" big="100" suffix="h" delta="+18%" />
            <Stat label="自動化タスク" big="284" suffix="件" delta="+12%" />
          </div>

          <div className="rounded-xl bg-paper p-4 border border-navy/5">
            <div className="text-[10px] font-bold tracking-widest uppercase text-navy/50 mb-2">
              Active AI Staff
            </div>
            <ul className="space-y-1.5 text-xs">
              {[
                { name: "メール代筆AI社員", state: "稼働中" },
                { name: "議事録AI社員", state: "稼働中" },
                { name: "経理AI社員", state: "稼働中" },
              ].map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between text-navy/80"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {r.name}
                  </span>
                  <span className="text-[10px] text-navy/50">{r.state}</span>
                </li>
              ))}
            </ul>
          </div>

          <SparkBars />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  big,
  suffix,
  delta,
}: {
  label: string;
  big: string;
  suffix: string;
  delta: string;
}) {
  return (
    <div className="rounded-xl border border-navy/10 bg-paper px-4 py-3">
      <div className="text-[10px] font-bold tracking-widest uppercase text-navy/50">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-en text-3xl md:text-4xl font-bold text-navy">
          {big}
        </span>
        <span className="text-sm font-bold text-navy/60">{suffix}</span>
      </div>
      <div className="mt-1 text-[10px] font-bold text-emerald-600">{delta}</div>
    </div>
  );
}

function SparkBars() {
  const bars = [38, 52, 46, 64, 58, 72, 80, 76, 90, 84, 95, 100];
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-navy/50">
          月次推移
        </span>
        <span className="text-[10px] text-vermilion font-bold">
          ＋ 100h / 月
        </span>
      </div>
      <div className="flex items-end gap-1 h-16">
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-navy to-vermilion"
            style={{ height: `${v}%` }}
          />
        ))}
      </div>
    </div>
  );
}
