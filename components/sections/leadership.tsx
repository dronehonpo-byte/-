import Image from "next/image";
import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { leadership } from "@/lib/content";

export function Leadership() {
  return (
    <Section
      id="leadership"
      tone="white"
      eyebrow="Leadership"
      heading="役員紹介"
      lead={
        <span className="block text-base md:text-lg font-bold text-navy/85">
          人生には、人間らしい非効率を。
          <br />
          業務には、あたらしいAI体験を。
        </span>
      }
    >
      <div className="grid gap-8 md:gap-10 md:grid-cols-2">
        {leadership.map((person, i) => (
          <Reveal key={person.id} delay={i * 0.1}>
            <article className="h-full rounded-3xl bg-mist border border-navy/10 overflow-hidden shadow-soft">
              {/* 写真 */}
              <div className="relative aspect-[4/5] w-full bg-navy/5">
                <Image
                  src={person.image}
                  alt={`${person.role} ${person.nameJp}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority={i === 0}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy/60 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
                  <div className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-vermilion-100">
                    {person.role}
                  </div>
                  <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-2xl md:text-3xl font-bold tracking-wide">
                      {person.nameJp}
                    </h3>
                    <span className="font-en text-sm md:text-base tracking-widest opacity-80">
                      {person.nameEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* テキスト */}
              <div className="p-6 md:p-8">
                <div className="text-xs md:text-sm font-bold text-vermilion mb-3">
                  {person.subtitle}
                </div>

                <p className="text-sm md:text-[15px] text-navy/85 leading-[1.9]">
                  {person.profile}
                </p>

                <div className="mt-6 border-l-[3px] border-vermilion pl-4 md:pl-5 space-y-3">
                  {person.message.map((line, idx) =>
                    line === "" ? (
                      <div key={idx} aria-hidden className="h-1" />
                    ) : (
                      <p
                        key={idx}
                        className="text-sm md:text-[15px] text-navy/85 leading-[1.95]"
                      >
                        {line}
                      </p>
                    ),
                  )}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
