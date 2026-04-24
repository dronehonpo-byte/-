import { Section } from "../ui/section";
import { Reveal, StaggerList, StaggerItem } from "../ui/reveal";
import { painPoints } from "@/lib/content";

export function PainPoints() {
  return (
    <Section
      id="problems"
      tone="white"
      eyebrow="Problems"
      heading={
        <>
          もしかして、社長であるあなたが、
          <br className="hidden md:inline" />
          こんな仕事をしていませんか？
        </>
      }
      lead="経営者の時間を奪っている、よくある5つの「本来AIに任せるべき仕事」。"
    >
      <StaggerList className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {painPoints.map((p) => (
          <StaggerItem key={p.title}>
            <div className="group h-full rounded-2xl border border-navy/10 bg-paper hover:border-gold/50 transition-all p-6 md:p-7 shadow-soft hover:shadow-card">
              <div className="flex items-start gap-4">
                <div
                  className="h-12 w-12 shrink-0 rounded-xl bg-gradient-gold flex items-center justify-center text-2xl shadow-gold/50"
                  aria-hidden
                >
                  {p.emoji}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-navy leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-navy/70 leading-relaxed border-l-2 border-gold/40 pl-3 italic">
                    「{p.voice}」
                  </p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-14 md:mt-20 max-w-3xl rounded-2xl bg-navy text-white p-6 md:p-10 text-center shadow-soft">
          <p className="text-base md:text-lg leading-relaxed text-white/90">
            これらは全て、本来
            <span className="text-gold font-bold">「AIに任せるべき仕事」</span>
            です。
            <br className="hidden md:inline" />
            KUHAKUは、経営者の時間を奪っている定型業務を、AIで完全自動化します。
          </p>
          <p className="mt-4 text-sm md:text-base text-gold font-bold">
            しかも、成果が出なければ1円もいただきません。
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
