"use client";

import { ChevronRight } from "lucide-react";
import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { flowSteps } from "@/lib/content";

export function Flow() {
  return (
    <Section
      id="flow"
      tone="white"
      eyebrow="How It Works"
      heading="導入フロー｜7ステップ"
      lead="初回相談から納品まで。成果報酬50/50で、最速10営業日。"
    >
      {/* 上部のSTEP矢印接続表示（最初の4ステップ） */}
      <Reveal>
        <div className="hidden md:flex items-center justify-center mb-12 gap-2">
          {flowSteps.slice(0, 4).map((step, i) => (
            <div key={step.step} className="flex items-center">
              <div className="rounded-full border-2 border-vermilion/40 bg-white px-5 py-2.5 shadow-soft">
                <div className="font-en text-[10px] tracking-[0.2em] text-vermilion font-bold">
                  STEP {String(step.step).padStart(2, "0")}
                </div>
                <div className="text-xs font-bold text-navy mt-0.5">
                  {step.title.split("（")[0]}
                </div>
              </div>
              {i < 3 && (
                <ChevronRight
                  size={28}
                  className="text-vermilion/50 mx-1"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </Reveal>

      <div className="relative mx-auto max-w-3xl">
        {/* 縦のタイムラインライン */}
        <div
          className="absolute left-5 md:left-1/2 top-2 bottom-2 w-px bg-navy/15 md:-translate-x-1/2"
          aria-hidden
        />

        <ol className="space-y-6 md:space-y-10">
          {flowSteps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.05}>
              <li
                className={`relative md:grid md:grid-cols-2 md:gap-8 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:col-start-2" : ""
                }`}
              >
                {/* カード */}
                <div
                  className={`pl-14 md:pl-0 ${
                    i % 2 === 1 ? "md:pr-12 md:text-right" : "md:pl-12"
                  }`}
                >
                  <div className="rounded-2xl border border-navy/10 bg-paper p-5 md:p-6 shadow-soft">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-en text-[10px] font-bold tracking-[0.2em] uppercase text-vermilion">
                        STEP {String(step.step).padStart(2, "0")}
                      </span>
                      <span className="text-[11px] font-bold bg-navy/5 text-navy/70 rounded-full px-2 py-0.5">
                        {step.duration}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-navy">
                      {step.step === 1 ? (
                        <>
                          無料相談（
                          <span className="text-vermilion">Zoom 30分</span>）
                        </>
                      ) : (
                        step.title
                      )}
                    </h3>
                    <p className="mt-2 text-xs md:text-sm text-navy/70 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>

                {/* タイムライン上のステップマーカー */}
                <div
                  className="absolute left-0 md:left-1/2 top-4 md:-translate-x-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-vermilion text-white font-en text-sm font-bold shadow-[0_8px_20px_-8px_rgba(200,16,46,0.5)] border-4 border-white"
                  aria-hidden
                >
                  {step.step}
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
