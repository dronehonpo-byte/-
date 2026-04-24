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
            <div className="h-full rounded-xl border border-ink/10 bg-white hover:border-navy/40 transition-colors p-6 md:p-7">
              <div className="flex items-start gap-4">
                <div
                  className="h-11 w-11 shrink-0 rounded-lg bg-navy/8 flex items-center justify-center text-xl"
                  aria-hidden
                >
                  {p.emoji}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-ink leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-ink/70 leading-relaxed border-l-2 border-navy/30 pl-3">
                    「{p.voice}」
                  </p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-14 md:mt-20 max-w-3xl rounded-xl bg-navy text-white p-6 md:p-10 text-center">
          <p className="text-base md:text-lg leading-relaxed text-white/95">
            これらは全て、本来
            <span className="text-accent font-bold">「AIに任せるべき仕事」</span>
            です。
            <br className="hidden md:inline" />
            KUHAKUは、経営者の時間を奪っている定型業務を、AIで完全自動化します。
          </p>
          <p className="mt-4 text-sm md:text-base text-accent font-bold">
            しかも、成果が出なければ1円もいただきません。
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
