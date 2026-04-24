import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { promises } from "@/lib/content";
import { company } from "@/lib/config";

export function Trust() {
  return (
    <Section
      id="trust"
      tone="paper"
      eyebrow="Trust"
      heading={
        <>
          私たちは、まだ若い会社です。
          <br className="hidden md:inline" />
          だからこそ、実績の「数」ではなく、
          <br className="hidden md:inline" />
          実行力の「質」でお応えします。
        </>
      }
    >
      {/* 代表プロフィール */}
      <Reveal>
        <div className="overflow-hidden rounded-xl bg-white border border-ink/10">
          <div className="grid md:grid-cols-5">
            {/* 左：ビジュアル */}
            <div className="md:col-span-2 bg-navy p-8 md:p-10 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Founder
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white font-en text-xl md:text-2xl font-bold">
                  MS
                </div>
                <div>
                  <div className="font-en text-xl md:text-2xl font-bold tracking-wide">
                    MASAKI
                  </div>
                  <div className="text-xs md:text-sm text-white/70 mt-1">
                    株式会社Miyabee 代表取締役
                  </div>
                </div>
              </div>
              <blockquote className="mt-8 text-xl md:text-3xl leading-relaxed font-bold">
                18歳で、
                <br />
                <span className="text-accent">株式会社を設立</span>
                しました。
              </blockquote>
            </div>

            {/* 右：詳細 */}
            <div className="md:col-span-3 p-8 md:p-10">
              <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-ink/50 mb-3">
                Profile
              </h3>
              <p className="text-sm md:text-base text-ink/80 leading-relaxed">
                慶應義塾大学 在学中／中高一貫校 中退 → 慶應合格 →
                在学中に法人設立（18歳）
              </p>

              <h4 className="mt-6 text-xs font-bold tracking-[0.2em] uppercase text-accent mb-2">
                専門領域
              </h4>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm text-ink/80">
                {[
                  "AI実装（Claude Code活用）",
                  "Google Apps Script 業務自動化",
                  "動画制作（実績500本超）",
                  "ドローン運用（国家資格保有）",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="text-accent mt-1">▪</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 法人情報 */}
      <Reveal delay={0.1}>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white border border-ink/10 p-6 md:p-8">
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-ink/50 mb-4">
              Company
            </h3>
            <dl className="text-sm space-y-3">
              <Row dt="商号" dd={company.name} />
              <Row dt="設立" dd={company.founded} />
              <Row dt="本店所在地" dd={company.address} />
              <Row dt="資本金" dd={company.capital} />
              <Row dt="許認可" dd={company.licenses} />
            </dl>
          </div>

          <div className="rounded-xl bg-navy text-white p-6 md:p-8">
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-accent mb-4">
              3つの約束
            </h3>
            <ul className="space-y-5">
              {promises.map((p) => (
                <li key={p.num} className="flex gap-4">
                  <div className="h-9 w-9 shrink-0 rounded-md bg-accent text-white font-en font-bold flex items-center justify-center">
                    {p.num}
                  </div>
                  <div>
                    <div className="font-bold">{p.title}</div>
                    <p className="mt-1 text-sm text-white/75 leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function Row({ dt, dd }: { dt: string; dd: string }) {
  return (
    <div className="flex gap-4 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <dt className="w-24 shrink-0 font-bold text-ink/60 text-xs md:text-sm pt-0.5">
        {dt}
      </dt>
      <dd className="text-ink leading-relaxed">{dd}</dd>
    </div>
  );
}
