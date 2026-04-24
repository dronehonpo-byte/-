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
                <div className={`pl-14 md:pl-0 ${i % 2 === 1 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="rounded-2xl border border-navy/10 bg-paper p-5 md:p-6 shadow-soft">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-en text-[10px] font-bold tracking-[0.2em] uppercase text-gold">
                        Step {step.step}
                      </span>
                      <span className="text-[11px] font-bold bg-navy/5 text-navy/70 rounded-full px-2 py-0.5">
                        {step.duration}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-navy">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs md:text-sm text-navy/70 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>

                {/* タイムライン上のステップマーカー */}
                <div
                  className="absolute left-0 md:left-1/2 top-4 md:-translate-x-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-gradient-gold text-navy font-en text-sm font-bold shadow-gold border-4 border-white"
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
