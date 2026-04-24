import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { strengths } from "@/lib/content";

export function Strengths() {
  return (
    <Section
      id="strengths"
      tone="paper"
      eyebrow="3 Strengths"
      heading="他のAIコンサルと、何が違うのか。"
      lead="KUHAKUが中小企業の経営者から選ばれる、3つの理由。"
    >
      <div className="grid gap-5 md:gap-6 md:grid-cols-3">
        {strengths.map((s, i) => (
          <Reveal key={s.num} delay={i * 0.1}>
            <article className="h-full rounded-xl border border-ink/10 bg-white p-7 md:p-9 transition-colors hover:border-navy/40">
              <div className="flex items-center justify-between">
                <span className="font-en text-5xl md:text-6xl font-bold text-ink/15 tracking-tight">
                  {s.num}
                </span>
                <span className="rounded-full border border-navy/30 text-navy text-[11px] font-bold tracking-widest px-3 py-1">
                  {s.chip}
                </span>
              </div>
              <h3 className="mt-4 text-xl md:text-2xl font-bold text-ink leading-snug">
                {s.title}
              </h3>
              <div className="mt-2 text-sm font-bold text-accent">{s.lead}</div>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-ink/75">
                {s.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
