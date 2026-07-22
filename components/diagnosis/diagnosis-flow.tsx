"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  employeeOptions,
  workOptions,
  aiUsageOptions,
  budgetOptions,
  timingOptions,
  calculate,
  HOURLY_RATE,
  type DiagnosisInput,
  type DiagnosisResult,
  type EmployeeRange,
  type AiUsage,
  type Budget,
  type StartTiming,
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

export function DiagnosisFlow() {
  const [step, setStep] = React.useState<Step>(1);
  const [employees, setEmployees] = React.useState<EmployeeRange | null>(null);
  const [works, setWorks] = React.useState<WorkTag[]>([]);
  const [aiUsage, setAiUsage] = React.useState<AiUsage | null>(null);
  const [budget, setBudget] = React.useState<Budget | null>(null);
  const [timing, setTiming] = React.useState<StartTiming | null>(null);
  const [result, setResult] = React.useState<DiagnosisResult | null>(null);

  const toggleWork = (tag: WorkTag) => {
    setWorks((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!employees;
      case 2:
        return works.length >= 1;
      case 3:
        return !!aiUsage;
      case 4:
        return !!budget;
      case 5:
        return !!timing;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step === 5) {
      const input: DiagnosisInput = {
        employees: employees!,
        works,
        aiUsage: aiUsage!,
        budget: budget!,
        timing: timing!,
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
    setAiUsage(null);
    setBudget(null);
    setTiming(null);
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {step !== 6 && <DiagnosisProgress current={step} total={5} />}

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepPanel
              key="s1"
              title="Q1. 従業員数（経営者含む）"
              subtitle="従業員規模が削減時間のベースになります。"
            >
              <Choices
                name="employees"
                options={employeeOptions}
                value={employees ?? ""}
                onChange={(v) => setEmployees(v as EmployeeRange)}
              />
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel
              key="s2"
              title="Q2. 月の業務で時間を取られているもの"
              subtitle={`複数選択できます（現在 ${works.length} 件）`}
            >
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {workOptions.map((o) => {
                  const selected = works.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleWork(o.value)}
                      aria-pressed={selected}
                      className={cn(
                        "relative rounded-xl border px-4 py-4 md:py-5 text-left transition-colors",
                        selected
                          ? "border-vermilion bg-vermilion/5"
                          : "border-navy/10 bg-white hover:border-navy/30",
                      )}
                    >
                      <div className="text-2xl md:text-3xl" aria-hidden>
                        {o.emoji}
                      </div>
                      <div className="mt-1 text-sm md:text-base font-bold text-ink">
                        {o.label}
                      </div>
                      {selected && (
                        <Check
                          size={16}
                          className="absolute top-3 right-3 text-vermilion"
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
              title="Q3. 社内のAI活用度"
              subtitle="現在のAI浸透度から、削減余地を算定します。"
            >
              <Choices
                name="aiUsage"
                options={aiUsageOptions}
                value={aiUsage ?? ""}
                onChange={(v) => setAiUsage(v as AiUsage)}
              />
            </StepPanel>
          )}

          {step === 4 && (
            <StepPanel
              key="s4"
              title="Q4. 業務効率化への月予算感"
              subtitle="参考までに、想定の月予算をお選びください。"
            >
              <Choices
                name="budget"
                options={budgetOptions}
                value={budget ?? ""}
                onChange={(v) => setBudget(v as Budget)}
              />
            </StepPanel>
          )}

          {step === 5 && (
            <StepPanel
              key="s5"
              title="Q5. 導入希望時期"
              subtitle="ご相談のタイミングをお聞かせください。"
            >
              <Choices
                name="timing"
                options={timingOptions}
                value={timing ?? ""}
                onChange={(v) => setTiming(v as StartTiming)}
              />
            </StepPanel>
          )}

          {step === 6 && result && (
            <ResultPanel key="s6" result={result} onReset={reset} />
          )}
        </AnimatePresence>
      </div>

      {step !== 6 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-ink/60 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
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
      <h2 className="text-xl md:text-2xl font-bold text-ink leading-snug">
        {title}
      </h2>
      <p className="mt-2 text-sm text-ink/70">{subtitle}</p>
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
              "flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors",
              selected
                ? "border-vermilion bg-vermilion/5"
                : "border-navy/10 bg-white hover:border-navy/30",
            )}
          >
            <span className="text-sm md:text-base font-bold text-ink">
              {o.label}
            </span>
            <span
              className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition",
                selected ? "border-vermilion bg-vermilion" : "border-navy/20",
              )}
              aria-hidden
            >
              {selected && <Check size={12} className="text-white" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: DiagnosisResult;
  onReset: () => void;
}) {
  const annualMan = Math.round(result.annualAmount / 10000);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* 削減時間 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-navy text-white p-8 md:p-12 text-center shadow-[0_30px_80px_-30px_rgba(10,31,68,0.6)]">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-vermilion/30 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-vermilion-200">
            Your Result
          </div>
          <h2 className="mt-4 text-base md:text-lg text-white/85 font-bold leading-relaxed">
            あなたの会社が、AI社員導入で
            <br />
            取り戻せる時間と金額
          </h2>
          <div className="mt-6 font-en font-bold text-vermilion-200 leading-none">
            <span className="text-base md:text-lg text-white/70 font-bold">
              月
            </span>
            <CountUp
              to={result.reducedHours}
              className="text-7xl md:text-[112px] mx-2"
            />
            <span className="text-3xl md:text-5xl">時間</span>
            <span className="text-base md:text-lg text-white/70 font-bold ml-1">
              削減
            </span>
          </div>
          <p className="mt-6 text-sm md:text-base text-white/85">
            年間 約{" "}
            <span className="text-gold font-bold text-xl md:text-2xl font-en">
              <CountUp to={annualMan} />
            </span>
            <span className="text-gold font-bold ml-0.5">万円</span> 相当
          </p>
          <p className="mt-3 text-[11px] md:text-xs text-white/55">
            ※ 平均人件費 {HOURLY_RATE.toLocaleString("ja-JP")}円/h
            で算出した試算値です
          </p>
        </div>
      </div>

      {/* 推奨メニュー */}
      {result.recommendedMenus.length > 0 && (
        <div>
          <h3 className="text-lg md:text-xl font-bold text-navy mb-4">
            🎯 おすすめのAI社員 Top {result.recommendedMenus.length}
          </h3>
          <div className="grid gap-3">
            {result.recommendedMenus.map((m, i) => {
              const t = tierMeta[m.tier];
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-ink/10 bg-white p-5 flex items-start gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-vermilion text-white font-en font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-en text-[10px] font-bold tracking-widest text-ink/55 bg-paper border border-ink/8 rounded px-1.5 py-0.5">
                        {m.no}
                      </span>
                      {m.aiRole && (
                        <span className="text-[10px] font-bold tracking-wider text-vermilion bg-vermilion/10 rounded-full px-2 py-0.5">
                          {m.aiRole}
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border"
                        style={{ color: t.color, borderColor: t.color }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm md:text-base font-bold text-ink leading-tight">
                      {m.name}
                    </div>
                    <div className="mt-1 text-xs text-ink/60 leading-relaxed">
                      {m.shortDescription}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-en text-xl md:text-2xl font-bold text-ink">
                      {m.price}
                      <span className="text-xs font-bold ml-0.5">万円</span>
                    </div>
                    <div className="text-[10px] font-bold text-navy/60">
                      + 月額1万
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
        <div className="rounded-2xl border-2 border-vermilion/40 bg-vermilion/5 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md bg-accent text-white text-2xl flex items-center justify-center">
              {result.recommendedSet.emoji}
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-vermilion">
                おすすめセット
              </div>
              <div className="font-bold text-ink text-base md:text-lg">
                {result.recommendedSet.name}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/75 leading-relaxed">
            {result.recommendedSet.summary}
          </p>
          <div className="mt-4 flex items-end justify-between pt-4 border-t border-vermilion/20">
            <div className="text-xs text-navy/60 font-en">
              {getSetMenus(result.recommendedSet)
                .map((m) => m.no)
                .join(" + ")}
            </div>
            <div>
              <span className="text-xs text-ink/60 line-through">
                {result.recommendedSet.listPrice}万円
              </span>
              <span className="font-en text-2xl font-bold text-vermilion ml-2">
                {result.recommendedSet.price}万円
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="grid gap-3 md:grid-cols-3 pt-4">
        <ButtonLink
          href={ctaLinks.timerex}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          size="lg"
          data-ga="diagnosis_timerex"
        >
          30分で無料相談する
        </ButtonLink>
        <ButtonLink
          href={ctaLinks.line}
          target="_blank"
          rel="noopener noreferrer"
          variant="navy"
          size="lg"
          data-ga="diagnosis_line"
        >
          LINE登録で資料を受け取る
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
        <Link
          href="/"
          className="text-sm text-navy/60 hover:text-navy underline underline-offset-4"
        >
          ← LPに戻る
        </Link>
      </div>
    </motion.div>
  );
}
