import { Section } from "../ui/section";
import { DiagnosisFlow } from "../diagnosis/diagnosis-flow";

export function DiagnosisInline() {
  return (
    <Section
      id="diagnosis"
      tone="paper"
      className="scroll-mt-20 md:scroll-mt-24"
      eyebrow="30秒診断"
      heading={
        <>
          あなたの会社、
          <br className="md:hidden" />
          <span className="text-accent">月何時間</span>
          削減できる？
        </>
      }
      lead="5つの質問に答えるだけ。貴社の規模と業務内容から、削減時間・金額・推奨メニューを自動で算出します。"
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-ink/10 bg-white p-6 md:p-10">
        <DiagnosisFlow />
      </div>
    </Section>
  );
}
