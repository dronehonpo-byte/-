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
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-ink/60 hover:text-ink mb-6"
          >
            ← TOPに戻る
          </Link>
          <div className="text-[11px] md:text-xs font-bold tracking-[0.22em] uppercase text-navy">
            Legal
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-ink leading-tight">
            {title}
          </h1>
          {leadIn && (
            <p className="mt-4 text-sm md:text-base text-ink/75 leading-relaxed">
              {leadIn}
            </p>
          )}
          {updated && (
            <p className="mt-4 text-xs text-ink/50">最終更新：{updated}</p>
          )}
          <article className="prose-legal mt-10 md:mt-14 bg-white border border-ink/10 rounded-xl p-6 md:p-10">
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
      <h2 className="text-base md:text-lg font-bold text-ink border-l-4 border-accent pl-3">
        第{num}条（{title}）
      </h2>
      <div className="mt-3 text-sm md:text-base text-ink/80 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
