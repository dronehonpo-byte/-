import Link from "next/link";
import { Header } from "../header";
import { Footer } from "../footer";
import { FloatingCTA } from "../floating-cta";

export function LegalLayout({
  title,
  leadIn,
  updated,
  children,
}: {
  title: string;
  leadIn?: React.ReactNode;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="bg-paper">
        <div className="container pt-28 md:pt-36 pb-24 md:pb-32 max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-navy/60 hover:text-navy mb-6"
          >
            ← TOPに戻る
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-3 py-1 text-[10px] md:text-xs font-bold tracking-[0.2em] text-navy/60">
            LEGAL
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-navy leading-tight">
            {title}
          </h1>
          {leadIn && (
            <p className="mt-4 text-sm md:text-base text-navy/75 leading-relaxed">
              {leadIn}
            </p>
          )}
          {updated && (
            <p className="mt-4 text-xs text-navy/50">最終更新：{updated}</p>
          )}
          <article className="prose-legal mt-10 md:mt-14 bg-white border border-navy/10 rounded-3xl p-6 md:p-10 shadow-soft">
            {children}
          </article>
        </div>
      </main>
      <Footer />
      <FloatingCTA />
    </>
  );
}

export function Article({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="not-first:mt-8">
      <h2 className="text-base md:text-lg font-bold text-navy border-l-4 border-gold pl-3">
        第{num}条（{title}）
      </h2>
      <div className="mt-3 text-sm md:text-base text-navy/80 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
