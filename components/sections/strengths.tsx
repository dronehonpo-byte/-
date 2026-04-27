import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { strengths, catchphrases } from "@/lib/content";

export function Strengths() {
  return (
    <Section
      id="strengths"
      tone="paper"
      eyebrow="3 Strengths"
      heading="他のAIコンサルと、何が違うのか。"
      lead="KUHAKUが中小企業から選ばれる、3つの理由。"
    >
      <Reveal>
        <p className="mb-10 md:mb-14 text-center text-2xl md:text-4xl font-bold tracking-wider text-navy">
          {catchphrases.workforce.split("、")[0]}、
          <span className="text-vermilion">
            {catchphrases.workforce.split("、")[1]}
          </span>
        </p>
      </Reveal>

      <div className="grid gap-5 md:gap-6 md:grid-cols-3">
        {strengths.map((s, i) => (
          <Reveal key={s.num} delay={i * 0.1}>
            <article className="h-full relative overflow-hidden rounded-3xl border border-navy/10 bg-white p-7 md:p-9 shadow-card transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(10,31,68,0.25)]">
              <div
                className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-vermilion/10 blur-2xl"
                aria-hidden
              />
              <div className="flex items-center justify-between">
                <span className="font-en text-5xl md:text-6xl font-bold text-vermilion/30 tracking-tight">
                  {s.num}
                </span>
                <span className="rounded-full border border-navy/30 text-navy text-[11px] font-bold tracking-widest px-3 py-1">
                  {s.chip}
                </span>
              </div>
              <h3 className="mt-4 text-xl md:text-2xl font-bold text-ink leading-snug">
                {s.title}
              </h3>
              <div className="mt-2 text-sm font-bold text-vermilion">
                {s.lead}
              </div>
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
