import Link from "next/link";
import { Calendar, Gift, Sparkles } from "lucide-react";
import { Reveal } from "../ui/reveal";
import { ctaLinks } from "@/lib/config";

export function FinalCta() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-gradient-navy text-white py-24 md:py-32"
    >
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />
      <div className="absolute inset-0 bg-dots opacity-10" aria-hidden />

      <div className="container relative">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              FINAL CTA
            </div>
            <h2 className="mt-6 text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.2]">
              さあ、
              <br className="md:hidden" />
              <span className="gold-shimmer">空白</span>
              をつくる時間です。
            </h2>
            <p className="mt-6 text-jp text-sm md:text-base text-white/75">
              あなたの月40時間は、どの仕事に使うべきか。
              <br className="hidden md:inline" />
              まずは30秒の診断か、60分の無料相談から。
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 md:mt-16 grid gap-4 md:grid-cols-3 max-w-4xl">
            <CtaCard
              href={ctaLinks.timerex}
              target="_blank"
              icon={<Calendar size={20} />}
              chip="💎 メイン"
              title="無料相談（60分）"
              body="TimeRexで日程を予約する"
              primary
              gaName="final_timerex"
            />
            <CtaCard
              href={ctaLinks.line}
              target="_blank"
              icon={<Gift size={20} />}
              chip="🎁 サブ①"
              title="LINE登録で3つの資料"
              body="25メニューPDF・優先順位マトリクス・AIチェックリスト50"
              gaName="final_line"
            />
            <CtaCard
              href={ctaLinks.diagnosis}
              icon={<Sparkles size={20} />}
              chip="🔍 サブ②"
              title="30秒のAI診断"
              body="今すぐ貴社に合うメニューを診断する"
              gaName="final_diagnosis"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CtaCard({
  href,
  target,
  icon,
  chip,
  title,
  body,
  primary,
  gaName,
}: {
  href: string;
  target?: string;
  icon: React.ReactNode;
  chip: string;
  title: string;
  body: string;
  primary?: boolean;
  gaName: string;
}) {
  const className = `group h-full rounded-3xl p-6 md:p-7 border transition-all hover:-translate-y-1 flex flex-col ${
    primary
      ? "bg-gradient-gold text-navy border-transparent shadow-gold"
      : "bg-white/5 border-white/10 backdrop-blur text-white hover:bg-white/10"
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-bold tracking-widest uppercase ${
            primary ? "text-navy/80" : "text-gold"
          }`}
        >
          {chip}
        </span>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
            primary
              ? "bg-navy text-white"
              : "bg-white/10 text-gold"
          } group-hover:scale-110 transition`}
        >
          {icon}
        </span>
      </div>
      <h3
        className={`mt-4 text-lg md:text-xl font-bold leading-tight ${
          primary ? "text-navy" : ""
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 text-xs md:text-sm leading-relaxed flex-1 ${
          primary ? "text-navy/75" : "text-white/70"
        }`}
      >
        {body}
      </p>
      <div
        className={`mt-6 text-xs md:text-sm font-bold ${
          primary ? "text-navy" : "text-gold"
        }`}
      >
        詳しく見る →
      </div>
    </>
  );

  if (target) {
    return (
      <a
        href={href}
        target={target}
        rel="noopener noreferrer"
        data-ga={gaName}
        className={className}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} data-ga={gaName} className={className}>
      {content}
    </Link>
  );
}
