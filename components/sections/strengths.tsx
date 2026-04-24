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
            <article className="h-full relative overflow-hidden rounded-3xl border border-navy/10 bg-white p-7 md:p-9 shadow-card transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(10,31,68,0.25)]">
              <div
                className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl group-hover:bg-gold/20"
                aria-hidden
              />
              <div className="flex items-center justify-between">
                <span className="font-en text-5xl md:text-6xl font-bold text-gold/30 tracking-tight">
                  {s.num}
                </span>
                <span className="rounded-full bg-navy text-white text-[11px] font-bold tracking-widest px-3 py-1">
                  {s.chip}
                </span>
              </div>
              <h3 className="mt-4 text-xl md:text-2xl font-bold text-navy leading-snug">
                {s.title}
              </h3>
              <div className="mt-2 text-sm font-bold text-gold">{s.lead}</div>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-navy/75">
                {s.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
