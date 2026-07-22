"use client";

import * as React from "react";
import Image from "next/image";
import { User } from "lucide-react";
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
              {/* 写真ブロック（実画像 → 失敗時 CSS プレースホルダー） */}
              <Portrait
                src={person.image}
                role={person.role}
                nameJp={person.nameJp}
                nameEn={person.nameEn}
                initials={person.id === "ceo" ? "M" : "K"}
                accent={person.id === "ceo" ? "navy" : "vermilion"}
                priority={i === 0}
              />

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

function Portrait({
  src,
  role,
  nameJp,
  nameEn,
  initials,
  accent,
  priority,
}: {
  src: string;
  role: string;
  nameJp: string;
  nameEn: string;
  initials: string;
  accent: "navy" | "vermilion";
  priority?: boolean;
}) {
  const [errored, setErrored] = React.useState(false);

  return (
    <div className="relative aspect-[4/5] w-full bg-navy/5 overflow-hidden">
      {!errored ? (
        // 実画像
        <Image
          src={src}
          alt={`${role} ${nameJp}`}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          priority={priority}
          onError={() => setErrored(true)}
          className="object-cover"
        />
      ) : (
        // フォールバック：CSSプレースホルダー
        <PlaceholderVisual initials={initials} accent={accent} />
      )}

      {/* 下部の名前ラベル（実画像でもプレースホルダーでも同じ見た目に） */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
        <div className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-vermilion-100">
          {role}
        </div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <h3 className="text-2xl md:text-3xl font-bold tracking-wide drop-shadow-sm">
            {nameJp}
          </h3>
          <span className="font-en text-sm md:text-base tracking-widest opacity-85">
            {nameEn}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlaceholderVisual({
  initials,
  accent,
}: {
  initials: string;
  accent: "navy" | "vermilion";
}) {
  const bg =
    accent === "navy"
      ? "bg-gradient-to-br from-navy via-navy-700 to-navy-800"
      : "bg-gradient-to-br from-vermilion via-vermilion-600 to-navy-700";

  return (
    <div className={`absolute inset-0 ${bg}`}>
      <div
        className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-black/30 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center text-white/95">
          <div className="font-en font-bold text-[140px] md:text-[180px] leading-none tracking-tighter drop-shadow-lg">
            {initials}
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur px-3 py-1 text-[10px] font-bold tracking-[0.25em] uppercase">
            <User size={12} />
            Photo coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
