import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { promises } from "@/lib/content";
import { company } from "@/lib/config";

export function Trust() {
  return (
    <Section
      id="trust"
      tone="paper"
      eyebrow="Company"
      heading="法人としての、信頼担保。"
      lead="株式会社Miyabeeは、若く小さな会社です。だからこそ、書面と運用で誠実さを示します。"
    >
      <Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-navy/10 p-6 md:p-8 shadow-soft">
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-navy/50 mb-4">
              Corporate Info
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
