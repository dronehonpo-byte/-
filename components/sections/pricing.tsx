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
import { catchphrases } from "@/lib/content";
import { cn } from "@/lib/utils";

const tierIncludes: Record<"light" | "standard" | "pro", string[]> = {
  light: [
    "GAS中心の自動化",
    "30日間バグ修正保証",
    "動画マニュアル付き",
  ],
  standard: [
    "複数API連携の本格実装",
    "30日間バグ修正保証",
    "動画マニュアル付き",
  ],
  pro: [
    "Webアプリ・AI高度実装",
    "30日間バグ修正保証",
    "動画マニュアル付き",
  ],
};

const monthlyIncludes = [
  "保守・運用サポート",
  "バグ修正・微調整（無制限）",
  "利用方法のご質問対応（無制限）",
  "月次稼働レポート",
];

export function Pricing() {
  return (
    <Section
      id="pricing"
      tone="paper"
      eyebrow="Pricing"
      heading="料金体系｜透明に、明確に。"
      lead="完全成果報酬50/50。基準未達なら全額返金。納品後は月額1万円で安心運用。"
    >
      <Reveal>
        <p className="mb-10 md:mb-14 text-center text-2xl md:text-4xl font-bold tracking-wider text-navy">
          24時間働く、
          <span className="text-vermilion">AI社員を雇う</span>。
        </p>
      </Reveal>

      {/* ① フロー図 */}
      <Reveal>
        <div className="rounded-3xl bg-white border border-navy/10 shadow-card p-6 md:p-10 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-bold text-navy flex items-center gap-2">
              <span className="text-vermilion">①</span> 成果報酬50/50モデル
            </h3>
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-vermilion bg-vermilion/10 rounded-full px-2.5 py-1">
              RISK ZERO
            </span>
          </div>
          {/* 元 Founder Message から移植 */}
          <p className="mb-6 text-sm md:text-base text-navy/85 leading-relaxed border-l-4 border-vermilion pl-4 italic">
            先に時間を取り戻してください。料金は、そのあとで結構です。
          </p>
          <PaymentFlowDiagram />
          <div className="mt-6 grid gap-2 text-center text-xs md:text-sm text-navy/70">
            <p>未達の場合：着手金を全額返金・追加請求なし。</p>
            <p className="text-navy/60">
              ※ 納品後は月額1万円の保守料金が発生します（無制限サポート）
            </p>
          </div>
        </div>
      </Reveal>

      {/* ② 基本料金3段階 */}
      <Reveal delay={0.1}>
        <h3 className="text-center text-lg md:text-xl font-bold text-navy mb-6">
          <span className="text-vermilion">②</span> 基本料金3段階
        </h3>
        <div className="grid gap-4 md:gap-5 md:grid-cols-3 mb-14">
          {(["light", "standard", "pro"] as const).map((tier) => {
            const t = tierMeta[tier];
            const isRec = tier === "standard";
            return (
              <article
                key={tier}
                className={cn(
                  "relative rounded-3xl border p-6 md:p-8 flex flex-col bg-white",
                  isRec
                    ? "border-vermilion shadow-[0_20px_60px_-20px_rgba(200,16,46,0.4)]"
                    : "border-navy/10 shadow-card",
                )}
              >
                {isRec && (
                  <PopularRibbon />
                )}
                <div
                  className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ color: t.color }}
                >
                  {tier === "light" && "📗 "}
                  {tier === "standard" && "📘 "}
                  {tier === "pro" && "📕 "}
                  {t.label}
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-en text-5xl md:text-6xl font-bold text-ink">
                    {t.price}
                  </span>
                  <span className="text-lg font-bold text-ink pb-1">万円</span>
                </div>
                <div className="mt-1 text-xs md:text-sm font-bold text-vermilion">
                  + 月額1万円
                  <span className="font-normal text-navy/60 ml-1">
                    （保守・無制限対応）
                  </span>
                </div>
                <p className="mt-3 text-sm text-navy/70 leading-relaxed">
                  {t.note}／納期 {t.leadtime}
                </p>
                <div className="mt-5 pt-5 border-t border-navy/10 text-xs text-navy/70 space-y-1.5">
                  {tierIncludes[tier].map((inc) => (
                    <div key={inc} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-vermilion shrink-0" />
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-5 border-t border-dashed border-navy/15">
                  <div className="text-[11px] font-bold tracking-widest uppercase text-vermilion mb-2">
                    月額1万円に含まれるもの
                  </div>
                  <ul className="text-xs text-navy/70 space-y-1">
                    {monthlyIncludes.map((m) => (
                      <li key={m} className="flex items-start gap-2">
                        <span className="text-vermilion mt-0.5">▪</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>

      {/* ③ 複数導入割引 */}
      <Reveal delay={0.15}>
        <h3 className="text-center text-lg md:text-xl font-bold text-navy mb-6">
          <span className="text-vermilion">③</span> 複数導入割引
        </h3>
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-ink/10 bg-white mb-14">
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
                    i === discountTiers.length - 1 && "bg-vermilion/5",
                  )}
                >
                  <td className="py-3 px-4 text-ink">{d.count}</td>
                  <td className="py-3 px-4 text-right font-bold font-en text-ink">
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
        <h3 className="text-center text-lg md:text-xl font-bold text-navy mb-3">
          <span className="text-vermilion">④</span> おすすめセット5種
        </h3>
        <p className="mb-8 text-center text-lg md:text-2xl font-bold tracking-wider text-vermilion/90">
          {catchphrases.noComplaint}
        </p>
        <div className="grid gap-4 md:grid-cols-2 mb-14">
          {setBundles.map((set) => {
            const items = getSetMenus(set);
            const monthly = items.length;
            return (
              <article
                key={set.id}
                className="rounded-xl border border-ink/10 bg-white p-5 md:p-6 hover:border-navy/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-navy/8 text-2xl flex items-center justify-center">
                    {set.emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-ink leading-tight">
                      {set.name}
                    </h4>
                    <div className="text-[11px] text-ink/50 font-en mt-0.5">
                      {items.map((m) => m.no).join(" + ")}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs md:text-sm text-ink/70 leading-relaxed">
                  {set.summary}
                </p>
                <div className="mt-4 flex items-end justify-between pt-3 border-t border-ink/10">
                  <div className="text-xs text-ink/60">
                    定価{" "}
                    <span className="line-through">{set.listPrice}万円</span>
                  </div>
                  <div className="text-right">
                    <div className="font-en text-2xl font-bold text-vermilion">
                      {set.price}
                      <span className="text-sm font-bold ml-0.5">万円</span>
                    </div>
                    <div className="text-[11px] font-bold text-navy/60">
                      + 月額{monthly}万円
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>

      {/* ⑤ フルパッケージ */}
      <Reveal delay={0.25}>
        <div className="rounded-xl bg-navy text-white p-8 md:p-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 text-white px-3 py-1 text-[10px] md:text-xs font-bold tracking-widest uppercase">
            <Crown size={14} /> Full Package
          </div>
          <h3 className="mt-4 text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
            KUHAKUフルパッケージ
          </h3>
          <p className="mt-3 text-sm md:text-base text-white/75">
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
            <h3 className="mt-4 text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
              KUHAKUフルパッケージ
            </h3>
            <p className="mt-3 text-sm md:text-base text-white/70">
              全25メニュー導入。約26%OFFの特別価格で、貴社専属のAIチームを構築。
            </p>

          <ul className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
            {fullPackage.includes.map((inc) => (
              <li key={inc} className="flex items-start gap-2 text-white/90">
                <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
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
                <div className="mt-1 text-sm md:text-base font-bold text-gold">
                  + 月額25万円（25メニュー × 1万円）
                </div>
              </div>
            </motion.div>

            <ul className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
              <li className="flex items-start gap-2 text-white/85">
                <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                <span>全25メニュー導入</span>
              </li>
              <li className="flex items-start gap-2 text-white/85">
                <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                <span>保守は月額制で継続提供</span>
              </li>
              <li className="flex items-start gap-2 text-white/85">
                <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                <span>専任担当者によるコンサルティング</span>
              </li>
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
                variant="gold"
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

function PopularRibbon() {
  return (
    <div className="absolute -top-3 -left-3 z-10">
      <div className="relative bg-vermilion text-white text-[10px] md:text-xs font-bold tracking-widest uppercase px-3 py-1.5 shadow-[0_8px_20px_-8px_rgba(200,16,46,0.6)] rounded-md">
        人気 No.1
      </div>
    </div>
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
                "relative h-14 w-14 rounded-2xl flex items-center justify-center font-en font-bold text-lg shadow-soft",
                i === 1 || i === 4
                  ? "bg-vermilion text-white"
                  : "bg-navy text-white",
              )}
            >
              {i + 1}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-full top-1/2 -translate-y-1/2 text-ink/30"
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
            <div className="mt-2 text-center text-xs md:text-sm font-bold text-ink">
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
                i === 1 || i === 4 ? "bg-vermilion" : "bg-navy",
              )}
            >
              {i + 1}
            </div>
            <div className="text-sm font-bold text-ink">{s.label}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
