"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Star, ChevronDown } from "lucide-react";
import { Section } from "../ui/section";
import { menus, tierMeta, type Menu } from "@/lib/menus";
import { cn } from "@/lib/utils";

export function MenusSection() {
  const [showAll, setShowAll] = React.useState(false);
  const featured = menus.filter((m) => m.featured);
  const others = menus.filter((m) => !m.featured);

  return (
    <Section
      id="menus"
      tone="white"
      eyebrow="Service Menu"
      heading={
        <>
          まずは、特に効く
          <br className="md:hidden" />
          <span className="text-accent">6つのメニュー</span>から。
        </>
      }
      lead="営業・マーケ・バックオフィス・書類・HR の5カテゴリで合計25メニュー。代表的な6つを紹介します。"
    >
      {/* Featured 6 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((menu) => (
          <MenuCard key={menu.id} menu={menu} />
        ))}
      </div>

      {/* Toggle for the other 19 */}
      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          aria-controls="all-menus"
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-sm font-bold text-ink hover:border-navy hover:text-navy transition-colors"
        >
          {showAll ? "閉じる" : `他にも${others.length}メニューを見る`}
          <ChevronDown
            size={16}
            className={cn("transition-transform", showAll && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showAll && (
          <motion.div
            id="all-menus"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-10">
              {others.map((menu) => (
                <MenuCard key={menu.id} menu={menu} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-10 text-center text-xs md:text-sm text-ink/60">
        ⭐ 印は KUHAKU が特に推奨する 6 メニューです。
      </p>
    </Section>
  );
}

function MenuCard({ menu }: { menu: Menu }) {
  const [open, setOpen] = React.useState(false);
  const t = tierMeta[menu.tier];

  return (
    <article
      className={cn(
        "h-full rounded-xl border bg-white transition-colors overflow-hidden",
        open ? "border-accent" : "border-ink/10 hover:border-navy/40",
      )}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-en text-[10px] font-bold tracking-[0.15em] text-ink/55 bg-paper rounded px-1.5 py-0.5">
              {menu.no}
            </span>
            {menu.featured && (
              <Star
                size={14}
                className="text-accent fill-accent shrink-0"
                aria-label="推奨メニュー"
              />
            )}
          </div>
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border"
            style={{ color: t.color, borderColor: t.color }}
          >
            {t.label}
          </span>
        </div>

        <h3 className="mt-3 text-lg md:text-xl font-bold text-ink leading-snug">
          {menu.name}
        </h3>
        <p className="mt-2 text-sm text-ink/70 leading-relaxed">
          {menu.shortDescription}
        </p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-ink/50">
              Price
            </div>
            <div className="font-en text-2xl md:text-3xl font-bold text-ink">
              {menu.price}
              <span className="text-sm font-bold ml-0.5">万円</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-1 max-w-[55%]">
            {menu.stack.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] bg-paper text-ink/70 rounded-full px-2 py-0.5 border border-ink/8"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`menu-detail-${menu.id}`}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 hover:border-navy py-2.5 text-xs md:text-sm font-bold text-ink hover:text-navy transition-colors"
        >
          {open ? "閉じる" : "詳しく見る"}
          <ChevronDown
            size={16}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`menu-detail-${menu.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink/10 bg-paper p-5 md:p-6 text-sm space-y-4">
              <Detail label="納品物" body={menu.deliverable} />
              <Detail label="完了基準" body={menu.completionCriteria} highlight />
              <Detail label="運用条件" body={menu.conditions} />
              <div className="flex items-center justify-between pt-2 text-xs text-ink/60">
                <span>納期目安: {t.leadtime}</span>
                <span>{t.note}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function Detail({
  label,
  body,
  highlight,
}: {
  label: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "text-[11px] font-bold tracking-[0.2em] uppercase mb-1",
          highlight ? "text-accent" : "text-ink/50",
        )}
      >
        <span className="inline-flex items-center gap-1">
          {highlight && <Plus size={12} />}
          {label}
        </span>
      </div>
      <p className="text-ink/80 leading-relaxed">{body}</p>
    </div>
  );
}
