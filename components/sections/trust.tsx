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
      {/* 法人情報 */}
      <Reveal>
        <div className="grid gap-6 md:grid-cols-2">
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
