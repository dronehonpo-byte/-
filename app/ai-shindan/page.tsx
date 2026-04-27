import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingCTA } from "@/components/floating-cta";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";

export const metadata: Metadata = {
  title: "30秒AI診断",
  description:
    "あなたの会社は月に何時間、何万円削減できるのか。5つの質問に答えるだけで、貴社に合う推奨メニューを自動で提案します。",
  alternates: { canonical: "/ai-shindan" },
};

export default function DiagnosisPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden pt-28 md:pt-36 pb-20 md:pb-28">
          <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
          <div
            className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-gold/15 blur-3xl"
            aria-hidden
          />

          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-navy/60 hover:text-navy mb-6"
              >
                ← LPに戻る
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white/80 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-navy/80 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-vermilion" />
                30秒でわかる
              </div>
              <h1 className="heading-xl mt-5 text-3xl md:text-5xl lg:text-6xl leading-[1.2]">
                AI社員を雇うと、
                <br className="md:hidden" />
                <span className="text-vermilion">月何時間</span>
                取り戻せる？
              </h1>
              <p className="mt-5 text-sm md:text-base text-navy/70 text-jp">
                5つの質問に答えるだけ。貴社の規模・業務・AI活用度から、
                <br className="hidden md:inline" />
                削減時間・金額・おすすめのAI社員を自動で算出します。
              </p>
            </div>

            <div className="mx-auto max-w-2xl rounded-3xl border border-navy/10 bg-white shadow-card p-6 md:p-10">
              <DiagnosisFlow />
            </div>

            <p className="mt-6 text-center text-xs text-navy/50">
              入力内容はサービス改善のため匿名で記録される場合があります。個人情報の取扱いは
              <Link href="/legal/privacy-policy" className="underline underline-offset-2 hover:text-navy">
                プライバシーポリシー
              </Link>
              をご確認ください。
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingCTA />
    </>
  );
}
