"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles, RotateCcw, Check } from "lucide-react";
import {
  employeeOptions,
  workOptions,
  weeklyHoursOptions,
  hourlyRateOptions,
  calculate,
  type DiagnosisInput,
  type DiagnosisResult,
  type EmployeeRange,
  type WeeklyHours,
  type HourlyRate,
  type WorkTag,
} from "@/lib/diagnosis";
import { ButtonLink, Button } from "../ui/button";
import { DiagnosisProgress } from "./progress";
import { CountUp } from "../count-up";
import { ctaLinks } from "@/lib/config";
import { cn } from "@/lib/utils";
import { tierMeta } from "@/lib/menus";
import { getSetMenus } from "@/lib/sets";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type Contact = {
  method: "line" | "email" | "skip";
  email?: string;
};

export function DiagnosisFlow() {
  const [step, setStep] = React.useState<Step>(1);
  const [employees, setEmployees] = React.useState<EmployeeRange | null>(null);
  const [works, setWorks] = React.useState<WorkTag[]>([]);
  const [weeklyHours, setWeeklyHours] = React.useState<WeeklyHours | null>(
    null,
  );
  const [hourlyRate, setHourlyRate] = React.useState<HourlyRate | null>(null);
  const [contact, setContact] = React.useState<Contact>({ method: "skip" });
  const [result, setResult] = React.useState<DiagnosisResult | null>(null);

  const toggleWork = (tag: WorkTag) => {
    setWorks((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev; // 最大3つ
      return [...prev, tag];
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!employees;
      case 2:
        return works.length >= 1;
      case 3:
        return !!weeklyHours;
      case 4:
        return !!hourlyRate;
      case 5:
        return true; // 任意
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step === 5) {
      // 結果計算
      const input: DiagnosisInput = {
        employees: employees!,
        works,
        weeklyHours: weeklyHours!,
        hourlyRate: hourlyRate!,
      };
      setResult(calculate(input));
      setStep(6);
      return;
    }
    setStep((s) => (s + 1) as Step);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const reset = () => {
    setStep(1);
    setEmployees(null);
    setWorks([]);
    setWeeklyHours(null);
    setHourlyRate(null);
    setContact({ method: "skip" });
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {step !== 6 && <DiagnosisProgress current={step} total={5} />}

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepPanel key="s1" title="Q1. 従業員数を教えてください" subtitle="規模によって削減効果の係数が変わります。">
              <Choices
                name="employees"
                options={employeeOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={employees ?? ""}
                onChange={(v) => setEmployees(v as EmployeeRange)}
              />
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel
              key="s2"
              title="Q2. どの業務を自動化したいですか？"
              subtitle={`最大3つまで選択できます（現在 ${works.length} / 3）`}
            >
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {workOptions.map((o) => {
                  const selected = works.includes(o.value);
                  const disabled = !selected && works.length >= 3;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleWork(o.value)}
                      disabled={disabled}
                      aria-pressed={selected}
                      className={cn(
                        "relative rounded-2xl border-2 px-4 py-4 md:py-5 text-left transition-all",
                        selected
                          ? "border-gold bg-gold/10 shadow-gold/30"
                          : "border-navy/10 bg-white hover:border-navy/30",
                        disabled && "opacity-40 cursor-not-allowed",
                      )}
                    >
                      <div className="text-2xl md:text-3xl" aria-hidden>
                        {o.emoji}
                      </div>
                      <div className="mt-1 text-sm md:text-base font-bold text-navy">
                        {o.label}
                      </div>
                      {selected && (
                        <Check
                          size={16}
                          className="absolute top-3 right-3 text-gold"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel
              key="s3"
              title="Q3. 週の業務時間は？"
              subtitle="選択した業務にかかっているおおよその時間を教えてください。"
            >
              <Choices
                name="weeklyHours"
                options={weeklyHoursOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={weeklyHours ?? ""}
                onChange={(v) => setWeeklyHours(v as WeeklyHours)}
              />
            </StepPanel>
          )}

          {step === 4 && (
            <StepPanel
              key="s4"
              title="Q4. 経営者ご自身の時給イメージは？"
              subtitle="「この業務をご自身でやっている時間」の機会コストを計算します。"
            >
              <Choices
                name="hourlyRate"
                options={hourlyRateOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={hourlyRate ?? ""}
                onChange={(v) => setHourlyRate(v as HourlyRate)}
              />
            </StepPanel>
          )}

          {step === 5 && (
            <StepPanel
              key="s5"
              title="Q5. 結果の受け取り方（任意）"
              subtitle="結果だけでなく、推奨メニューPDFも受け取れます。スキップ可。"
            >
              <div className="grid gap-3">
                <ContactOption
                  selected={contact.method === "line"}
                  label="💚 LINEで受け取る（最速）"
                  onClick={() => setContact({ method: "line" })}
                />
                <ContactOption
                  selected={contact.method === "email"}
                  label="✉️ メールで受け取る"
                  onClick={() => setContact({ method: "email" })}
                />
                {contact.method === "email" && (
                  <input
                    type="email"
                    required
                    value={contact.email ?? ""}
                    onChange={(e) =>
                      setContact({ method: "email", email: e.target.value })
                    }
                    placeholder="your@email.com"
                    className="w-full rounded-xl border-2 border-navy/10 focus:border-gold bg-white px-4 py-3 text-navy"
                  />
                )}
                <ContactOption
                  selected={contact.method === "skip"}
                  label="スキップして結果を見る"
                  onClick={() => setContact({ method: "skip" })}
                />
              </div>
            </StepPanel>
          )}

          {step === 6 && result && (
            <ResultPanel
              key="s6"
              result={result}
              onReset={reset}
              contact={contact}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ナビゲーション */}
      {step !== 6 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-navy/60 hover:text-navy disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft size={16} />
            戻る
          </button>
          <Button
            variant="primary"
            size="lg"
            onClick={goNext}
            disabled={!canProceed()}
          >
            {step === 5 ? (
              <>
                <Sparkles size={18} /> 結果を見る
              </>
            ) : (
              <>
                次へ <ArrowRight size={18} />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function StepPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl md:text-2xl font-bold text-navy leading-snug">
        {title}
      </h2>
      <p className="mt-2 text-sm text-navy/70">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </motion.div>
  );
}

function Choices({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 md:gap-3">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all",
              selected
                ? "border-gold bg-gold/10 shadow-gold/30"
                : "border-navy/10 bg-white hover:border-navy/30",
            )}
          >
            <span className="text-sm md:text-base font-bold text-navy">
              {o.label}
            </span>
            <span
              className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition",
                selected ? "border-gold bg-gold" : "border-navy/20",
              )}
              aria-hidden
            >
              {selected && <Check size={12} className="text-navy" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ContactOption({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-2xl border-2 px-5 py-4 text-left text-sm md:text-base font-bold text-navy transition",
        selected
          ? "border-gold bg-gold/10"
          : "border-navy/10 bg-white hover:border-navy/30",
      )}
    >
      {label}
    </button>
  );
}

function ResultPanel({
  result,
  onReset,
  contact,
}: {
  result: DiagnosisResult;
  onReset: () => void;
  contact: Contact;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* 削減時間 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-navy text-white p-8 md:p-12 text-center shadow-[0_30px_80px_-30px_rgba(10,31,68,0.6)]">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gold/30 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-gold">
            Your Result
          </div>
          <h2 className="mt-4 text-lg md:text-xl text-white/80 font-bold">
            あなたの会社は、月に
          </h2>
          <div className="mt-4 font-en font-bold text-gold leading-none">
            <CountUp
              to={result.savedHours}
              className="text-7xl md:text-[112px]"
            />
            <span className="text-3xl md:text-5xl ml-2">時間</span>
          </div>
          <p className="mt-4 text-sm md:text-base text-white/75">
            = 金額換算で約{" "}
            <span className="text-gold font-bold">
              <CountUp to={result.savedYen} format={(n) => Math.round(n).toLocaleString("ja-JP")} />
              円
            </span>
            /月 を削減できます
          </p>
          <p className="mt-2 text-[11px] md:text-xs text-white/50">
            ※ 削減時間（月）= 週時間中央値 × 4週 × 0.7 × 規模係数
          </p>
        </div>
      </div>

      {/* 推奨メニュー */}
      {result.recommendedMenus.length > 0 && (
        <div>
          <h3 className="text-lg md:text-xl font-bold text-navy mb-4">
            🎯 貴社におすすめのメニュー Top 3
          </h3>
          <div className="grid gap-3">
            {result.recommendedMenus.map((m, i) => {
              const t = tierMeta[m.tier];
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-navy/10 bg-white p-5 shadow-soft flex items-start gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-gold text-navy font-en font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-en text-[10px] font-bold tracking-widest text-navy/50 bg-navy/5 rounded px-1.5 py-0.5">
                        {m.no}
                      </span>
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border"
                        style={{ color: t.color, borderColor: t.color }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm md:text-base font-bold text-navy leading-tight">
                      {m.name}
                    </div>
                    <div className="mt-1 text-xs text-navy/60 leading-relaxed">
                      {m.shortDescription}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-en text-xl md:text-2xl font-bold text-navy">
                      {m.price}
                      <span className="text-xs font-bold ml-0.5">万円</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* おすすめセット */}
      {result.recommendedSet && (
        <div className="rounded-2xl border-2 border-gold bg-gold/5 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-gold text-2xl flex items-center justify-center">
              {result.recommendedSet.emoji}
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-gold">
                おすすめセット
              </div>
              <div className="font-bold text-navy text-base md:text-lg">
                {result.recommendedSet.name}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-navy/75 leading-relaxed">
            {result.recommendedSet.summary}
          </p>
          <div className="mt-4 flex items-end justify-between pt-4 border-t border-gold/30">
            <div className="text-xs text-navy/60 font-en">
              {getSetMenus(result.recommendedSet)
                .map((m) => m.no)
                .join(" + ")}
            </div>
            <div>
              <span className="text-xs text-navy/60 line-through">
                {result.recommendedSet.listPrice}万円
              </span>
              <span className="font-en text-2xl font-bold text-gold ml-2">
                {result.recommendedSet.price}万円
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="grid gap-3 md:grid-cols-3 pt-4">
        <ButtonLink
          href={ctaLinks.line}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          size="lg"
          data-ga="diagnosis_line"
        >
          💚 LINE登録で詳細を受け取る
        </ButtonLink>
        <ButtonLink
          href={ctaLinks.timerex}
          target="_blank"
          rel="noopener noreferrer"
          variant="navy"
          size="lg"
          data-ga="diagnosis_timerex"
        >
          📅 無料相談を予約
        </ButtonLink>
        <Button
          variant="outline"
          size="lg"
          onClick={onReset}
          data-ga="diagnosis_redo"
        >
          <RotateCcw size={16} />
          もう一度診断する
        </Button>
      </div>

      <div className="pt-4 text-center">
        <Link href="/" className="text-sm text-navy/60 hover:text-navy underline underline-offset-4">
          ← ランディングページに戻る
        </Link>
      </div>

      {contact.method === "email" && contact.email && (
        <p className="text-center text-xs text-navy/50">
          結果を {contact.email} にお送りする準備ができました。
        </p>
      )}
    </motion.div>
  );
}
