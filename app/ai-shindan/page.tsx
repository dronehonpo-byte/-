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
        <section className="relative bg-paper pt-28 md:pt-36 pb-20 md:pb-28">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-ink/60 hover:text-ink mb-6"
              >
                ← LPに戻る
              </Link>
              <div className="text-[11px] md:text-xs font-bold tracking-[0.22em] uppercase text-navy">
                30秒でわかる
              </div>
              <h1 className="heading-xl mt-3 text-3xl md:text-5xl lg:text-6xl leading-[1.18]">
                あなたの会社、
                <br className="md:hidden" />
                <span className="text-accent">月何時間</span>
                削減できる？
              </h1>
              <p className="mt-5 text-sm md:text-base text-ink/75 text-jp">
                5つの質問に答えるだけ。貴社の規模と業務内容から、
                <br className="hidden md:inline" />
                削減時間・金額・推奨メニューを自動で算出します。
              </p>
            </div>

            <div className="mx-auto max-w-2xl rounded-xl border border-ink/10 bg-white p-6 md:p-10">
              <DiagnosisFlow />
            </div>

            <p className="mt-6 text-center text-xs text-ink/55">
              入力内容はサービス改善のため匿名で記録される場合があります。個人情報の取扱いは
              <Link href="/legal/privacy-policy" className="underline underline-offset-2 hover:text-ink">
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
