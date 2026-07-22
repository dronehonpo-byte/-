import { Section } from "../ui/section";
import { DiagnosisFlow } from "../diagnosis/diagnosis-flow";

export function DiagnosisInline() {
  return (
    <Section
      id="diagnosis"
      tone="paper"
      className="scroll-mt-20 md:scroll-mt-24"
      eyebrow="30秒AI診断"
      heading={
        <>
          AI社員を雇うと、
          <br className="md:hidden" />
          <span className="text-accent">月何時間</span>
          取り戻せる？
        </>
      }
      lead="5つの質問に答えるだけ。貴社の規模・業務・AI活用度から、削減時間・金額・おすすめのAI社員を自動で算出します。"
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-ink/10 bg-white p-6 md:p-10">
        <DiagnosisFlow />
      </div>
    </Section>
  );
}
