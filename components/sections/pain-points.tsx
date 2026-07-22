"use client";

import { Sparkles } from "lucide-react";
import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { painPoints, catchphrases } from "@/lib/content";
import { ButtonLink } from "../ui/button";
import { ctaLinks } from "@/lib/config";

export function PainPoints() {
  return (
    <Section id="problems" tone="white" className="!pb-12 md:!pb-16">
      <div className="text-center mb-12 md:mb-16">
        <div className="inline-flex items-center gap-3 text-vermilion text-base md:text-2xl font-bold">
          <Slash dir="left" />
          <span className="text-navy">こんな悩み、ありませんか？</span>
          <Slash dir="right" />
        </div>
        <p className="mt-4 text-xs md:text-sm tracking-[0.25em] text-navy/40 font-en">
          PROBLEMS
        </p>
      </div>

      <div className="grid gap-4 md:gap-5 md:grid-cols-3">
        {painPoints.map((p, i) => (
          <Reveal key={p.no} delay={i * 0.08}>
            <article className="h-full rounded-2xl border border-navy/10 bg-paper hover:border-vermilion/40 transition-all p-6 md:p-7 shadow-soft">
              <div className="flex items-baseline justify-between">
                <span className="font-en text-3xl md:text-4xl font-bold text-vermilion/30 tracking-tight">
                  {p.no}
                </span>
                <span className="text-3xl" aria-hidden>
                  {p.emoji}
                </span>
              </div>
              <h3 className="mt-3 text-base md:text-lg font-bold text-navy leading-snug">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-navy/75 leading-relaxed">
                {p.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      {/* キャッチコピーD（締めの直前） */}
      <Reveal delay={0.1}>
        <p className="mx-auto mt-14 md:mt-20 text-center text-2xl md:text-4xl font-bold tracking-wider text-vermilion">
          {catchphrases.noComplaint}
        </p>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-10 md:mt-12 max-w-3xl rounded-2xl bg-navy text-white p-6 md:p-10 text-center shadow-soft">
          <p className="text-base md:text-lg leading-relaxed text-white/90">
            これらは全て、本来
            <span className="text-gold font-bold">「AI社員に任せるべき仕事」</span>
            です。
            <br className="hidden md:inline" />
            KUHAKUは、あなたの会社の定型業務を、AI社員に巻き取らせます。
          </p>
          <p className="mt-4 text-sm md:text-base text-gold font-bold">
            成果が出なければ、1円もいただきません。
          </p>
        </div>
      </Reveal>

      {/* 中段CTA：キャッチコピーB */}
      <Reveal delay={0.2}>
        <div className="mx-auto mt-16 md:mt-24 text-center">
          <p className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight text-navy">
            次の社員は、
            <br className="md:hidden" />
            <span className="text-vermilion">AIにしませんか</span>。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <ButtonLink
              href={ctaLinks.timerex}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="xl"
              data-ga="mid_timerex"
            >
              30分で無料相談する
            </ButtonLink>
            <ButtonLink
              href={ctaLinks.diagnosis}
              variant="outline"
              size="xl"
              data-ga="mid_diagnosis"
            >
              <Sparkles size={18} />
              30秒でAI診断する
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function Slash({ dir }: { dir: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className="inline-block h-6 md:h-8 w-[3px] bg-vermilion"
      style={{
        transform: dir === "left" ? "skewX(-18deg)" : "skewX(18deg)",
      }}
    />
  );
}

