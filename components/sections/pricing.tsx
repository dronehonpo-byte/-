"use client";

import { motion } from "framer-motion";
import { Crown, CheckCircle2 } from "lucide-react";
import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { tierMeta } from "@/lib/menus";
import {
  setBundles,
  discountTiers,
  fullPackage,
  getSetMenus,
} from "@/lib/sets";
import { ButtonLink } from "../ui/button";
import { ctaLinks } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <Section
      id="pricing"
      tone="paper"
      eyebrow="Pricing"
      heading="料金体系｜透明に、明確に。"
      lead="完全成果報酬50/50。基準未達なら全額返金。これが、KUHAKUの値段の約束です。"
    >
      {/* ① フロー図 */}
      <Reveal>
        <div className="rounded-3xl bg-white border border-navy/10 shadow-card p-6 md:p-10 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg md:text-xl font-bold text-navy flex items-center gap-2">
              <span className="text-gold">①</span> 成果報酬50/50モデル
            </h3>
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-gold bg-gold/10 rounded-full px-2.5 py-1">
              RISK ZERO
            </span>
          </div>
          <PaymentFlowDiagram />
          <p className="mt-6 text-center text-xs md:text-sm text-navy/70">
            未達の場合：着手金を全額返金・追加請求なし。
          </p>
        </div>
      </Reveal>

      {/* ② 基本料金3段階 */}
      <Reveal delay={0.1}>
        <h3 className="text-center text-lg md:text-xl font-bold text-navy mb-6">
          <span className="text-gold">②</span> 基本料金3段階
        </h3>
        <div className="grid gap-4 md:grid-cols-3 mb-14">
          {(["light", "standard", "pro"] as const).map((tier) => {
            const t = tierMeta[tier];
            const isRec = tier === "standard";
            return (
              <article
                key={tier}
                className={cn(
                  "relative rounded-3xl border p-6 md:p-8 flex flex-col",
                  isRec
                    ? "border-gold bg-white shadow-gold scale-[1.02] md:scale-105"
                    : "border-navy/10 bg-white shadow-card",
                )}
              >
                {isRec && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-[10px] md:text-xs font-bold tracking-widest uppercase text-navy shadow-gold">
                    Recommended
                  </div>
                )}
                <div className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: t.color }}>
                  {tier === "light" && "📗 "}
                  {tier === "standard" && "📘 "}
                  {tier === "pro" && "📕 "}
                  {t.label}
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-en text-5xl md:text-6xl font-bold text-navy">
                    {t.price}
                  </span>
                  <span className="text-lg font-bold text-navy pb-1">万円</span>
                </div>
                <p className="mt-3 text-sm text-navy/70 leading-relaxed">
                  {t.note}
                </p>
                <div className="mt-5 pt-5 border-t border-navy/10 text-xs text-navy/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-gold" />
                    納期: {t.leadtime}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 size={14} className="text-gold" />
                    30日間バグ修正保証
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 size={14} className="text-gold" />
                    動画マニュアル付き
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>

      {/* ③ 複数導入割引 */}
      <Reveal delay={0.15}>
        <h3 className="text-center text-lg md:text-xl font-bold text-navy mb-6">
          <span className="text-gold">③</span> 複数導入割引
        </h3>
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-navy/10 bg-white mb-14 shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-navy text-white">
              <tr>
                <th className="py-3 px-4 text-left font-bold">同時契約数</th>
                <th className="py-3 px-4 text-right font-bold">割引率</th>
              </tr>
            </thead>
            <tbody>
              {discountTiers.map((d, i) => (
                <tr
                  key={d.count}
                  className={cn(
                    "border-t border-navy/10",
                    i === discountTiers.length - 1 && "bg-gold/10",
                  )}
                >
                  <td className="py-3 px-4 text-navy">{d.count}</td>
                  <td className="py-3 px-4 text-right font-bold font-en text-navy">
                    {d.rate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* ④ セット5種 */}
      <Reveal delay={0.2}>
        <h3 className="text-center text-lg md:text-xl font-bold text-navy mb-6">
          <span className="text-gold">④</span> おすすめセット5種
        </h3>
        <div className="grid gap-4 md:grid-cols-2 mb-14">
          {setBundles.map((set) => {
            const items = getSetMenus(set);
            return (
              <article
                key={set.id}
                className="rounded-2xl border border-navy/10 bg-white p-5 md:p-6 shadow-soft hover:shadow-card transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-gold text-2xl flex items-center justify-center">
                    {set.emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-navy leading-tight">
                      {set.name}
                    </h4>
                    <div className="text-[11px] text-navy/50 font-en mt-0.5">
                      {items.map((m) => m.no).join(" + ")}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs md:text-sm text-navy/70 leading-relaxed">
                  {set.summary}
                </p>
                <div className="mt-4 flex items-end justify-between pt-3 border-t border-navy/10">
                  <div className="text-xs text-navy/60">
                    定価{" "}
                    <span className="line-through">{set.listPrice}万円</span>
                  </div>
                  <div className="font-en text-2xl font-bold text-gold">
                    {set.price}
                    <span className="text-sm font-bold ml-0.5">万円</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>

      {/* ⑤ フルパッケージ */}
      <Reveal delay={0.25}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-navy text-white p-8 md:p-14 shadow-[0_30px_80px_-30px_rgba(10,31,68,0.6)]">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gold/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gold/20 blur-3xl" aria-hidden />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold text-navy px-3 py-1 text-[10px] md:text-xs font-bold tracking-widest uppercase">
              <Crown size={14} /> Gold Package
            </div>
            <h3 className="mt-4 text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
              KUHAKUフルパッケージ
            </h3>
            <p className="mt-3 text-sm md:text-base text-white/70">
              全25メニュー導入。約26%OFFの特別価格で、貴社を丸ごとAIに委ねる。
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-8 md:mt-10 flex flex-wrap items-end gap-3 md:gap-6"
            >
              <div>
                <div className="text-xs text-white/50 tracking-widest uppercase">
                  List Price
                </div>
                <div className="font-en text-xl md:text-2xl line-through text-white/40">
                  {fullPackage.listPrice}万円
                </div>
              </div>
              <div>
                <div className="text-xs text-gold tracking-widest uppercase">
                  Special
                </div>
                <div className="font-en text-5xl md:text-7xl font-bold gold-shimmer">
                  {fullPackage.price}
                  <span className="text-2xl font-bold ml-1">万円</span>
                </div>
              </div>
            </motion.div>

            <ul className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
              {fullPackage.includes.map((inc) => (
                <li key={inc} className="flex items-start gap-2 text-white/85">
                  <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 grid gap-2 text-xs text-white/60">
              <div>対象：{fullPackage.target}</div>
              <div>納期：{fullPackage.leadtime}</div>
            </div>

            <div className="mt-8">
              <ButtonLink
                href={ctaLinks.timerex}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="lg"
                data-ga="pricing_full_package"
              >
                フルパッケージの相談をする
              </ButtonLink>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/** 成果報酬50/50のフロー図（SVG） */
function PaymentFlowDiagram() {
  const steps = [
    { label: "契約" },
    { label: "着手金50%" },
    { label: "開発・実装" },
    { label: "完了基準達成" },
    { label: "残金50%" },
    { label: "納品完了" },
  ];

  return (
    <div className="relative">
      {/* デスクトップ: 横並び */}
      <div className="hidden md:grid md:grid-cols-6 gap-2 items-center">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center">
            <div
              className={cn(
                "relative h-14 w-14 rounded-2xl flex items-center justify-center font-en font-bold text-lg text-white shadow-soft",
                i === 1 || i === 4
                  ? "bg-gradient-gold text-navy"
                  : "bg-navy",
              )}
            >
              {i + 1}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-full top-1/2 -translate-y-1/2 text-navy/30"
                >
                  <svg width="48" height="12" viewBox="0 0 48 12">
                    <line
                      x1="0"
                      y1="6"
                      x2="40"
                      y2="6"
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    />
                    <polygon points="40,0 48,6 40,12" fill="currentColor" />
                  </svg>
                </span>
              )}
            </div>
            <div className="mt-2 text-center text-xs md:text-sm font-bold text-navy">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* モバイル: 縦並び */}
      <ol className="md:hidden space-y-3">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-4">
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-en font-bold text-white shadow-soft",
                i === 1 || i === 4
                  ? "bg-gradient-gold text-navy"
                  : "bg-navy",
              )}
            >
              {i + 1}
            </div>
            <div className="text-sm font-bold text-navy">{s.label}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
