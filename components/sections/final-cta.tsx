import Link from "next/link";
import { Calendar, Gift, Sparkles } from "lucide-react";
import { Reveal } from "../ui/reveal";
import { ctaLinks } from "@/lib/config";

export function FinalCta() {
  return (
    <section
      id="cta"
      className="relative bg-navy text-white py-24 md:py-32"
    >
      <div className="container">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-[11px] md:text-xs font-bold tracking-[0.22em] uppercase text-accent">
              Final CTA
            </div>
            <h2 className="mt-5 text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.18]">
              さあ、
              <br className="md:hidden" />
              <span className="text-accent">空白</span>
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
            <div className="md:col-span-2">
              <CtaCard
                href={ctaLinks.timerex}
                target="_blank"
                icon={<Calendar size={22} />}
                chip="💎 まずはここから"
                title="無料相談（60分）を予約する"
                body="現状ヒアリング → 推奨メニュー → 概算見積。Zoomで売り込みなし。"
                primary
                gaName="final_timerex"
              />
            </div>
            <div className="grid gap-4">
              <CtaCard
                href={ctaLinks.line}
                target="_blank"
                icon={<Gift size={18} />}
                chip="サブ"
                title="LINE登録で資料を受け取る"
                body="25メニューPDF・優先順位マトリクス"
                compact
                gaName="final_line"
              />
              <CtaCard
                href={ctaLinks.diagnosis}
                icon={<Sparkles size={18} />}
                chip="サブ"
                title="30秒のAI診断"
                body="貴社に合うメニューを自動算出"
                compact
                gaName="final_diagnosis"
              />
            </div>
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
  compact,
  gaName,
}: {
  href: string;
  target?: string;
  icon: React.ReactNode;
  chip: string;
  title: string;
  body: string;
  primary?: boolean;
  compact?: boolean;
  gaName: string;
}) {
  const className = `group h-full rounded-xl border transition-colors flex flex-col ${
    primary
      ? "bg-accent text-white border-accent hover:bg-accent-700 p-6 md:p-8"
      : compact
        ? "bg-white/5 border-white/15 text-white hover:bg-white/10 p-4 md:p-5"
        : "bg-white/5 border-white/15 text-white hover:bg-white/10 p-6 md:p-7"
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] md:text-[11px] font-bold tracking-widest uppercase ${
            primary ? "text-white/85" : "text-accent"
          }`}
        >
          {chip}
        </span>
        <span
          className={`inline-flex items-center justify-center rounded-md ${
            compact ? "h-8 w-8" : "h-9 w-9"
          } ${primary ? "bg-white/15 text-white" : "bg-white/10 text-accent"}`}
        >
          {icon}
        </span>
      </div>
      <h3
        className={`mt-3 font-bold leading-tight ${
          primary ? "text-xl md:text-2xl" : "text-sm md:text-base"
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 leading-relaxed flex-1 ${
          primary ? "text-sm md:text-base text-white/90" : "text-xs text-white/70"
        }`}
      >
        {body}
      </p>
      <div
        className={`mt-4 font-bold ${
          primary ? "text-sm md:text-base text-white" : "text-xs text-accent"
        }`}
      >
        {primary ? "TimeRexで日程を選ぶ →" : "詳しく見る →"}
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
