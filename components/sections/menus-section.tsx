"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Star, ChevronDown } from "lucide-react";
import { Section } from "../ui/section";
import {
  categories,
  getMenusByCategory,
  tierMeta,
  type Category,
  type Menu,
} from "@/lib/menus";
import { cn } from "@/lib/utils";

export function MenusSection() {
  const [active, setActive] = React.useState<Category>("sales");

  return (
    <Section
      id="menus"
      tone="white"
      eyebrow="Service Menu"
      heading="25の業務を、自動化できます。"
      lead="5カテゴリ・25メニュー。貴社に合う組み合わせで導入できます。"
    >
      {/* タブ */}
      <div
        role="tablist"
        aria-label="サービスカテゴリ"
        className="mx-auto mb-10 flex flex-wrap justify-center gap-2 md:gap-3"
      >
        {categories.map((cat) => {
          const isActive = cat.id === active;
          return (
            <button
              key={cat.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${cat.id}`}
              id={`tab-${cat.id}`}
              onClick={() => setActive(cat.id)}
              className={cn(
                "group relative rounded-full border-2 px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-bold transition-all",
                isActive
                  ? "border-navy bg-navy text-white shadow-soft"
                  : "border-navy/15 bg-white text-navy/70 hover:border-navy hover:text-navy",
              )}
            >
              <span className="mr-1" aria-hidden>
                {cat.emoji}
              </span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* パネル */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          id={`panel-${cat.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${cat.id}`}
          hidden={cat.id !== active}
        >
          {cat.id === active && (
            <AnimatePresence mode="wait">
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {getMenusByCategory(cat.id).map((menu) => (
                  <MenuCard key={menu.id} menu={menu} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      ))}

      <p className="mt-10 text-center text-xs md:text-sm text-navy/60">
        ⭐ 印は各カテゴリの最推奨メニュー。どれから始めるか迷ったらこれ。
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
        "h-full rounded-2xl border bg-white shadow-soft transition-all overflow-hidden",
        open
          ? "border-gold shadow-[0_16px_44px_-18px_rgba(201,169,75,0.5)]"
          : "border-navy/10 hover:border-navy/30 hover:shadow-card",
      )}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-en text-[10px] font-bold tracking-[0.15em] text-navy/50 bg-navy/5 rounded px-1.5 py-0.5">
              {menu.no}
            </span>
            {menu.featured && (
              <Star
                size={14}
                className="text-gold fill-gold shrink-0"
                aria-label="注目メニュー"
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

        <h3 className="mt-3 text-lg md:text-xl font-bold text-navy leading-snug">
          {menu.name}
        </h3>
        <p className="mt-2 text-sm text-navy/70 leading-relaxed">
          {menu.shortDescription}
        </p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-navy/50">
              Price
            </div>
            <div className="font-en text-2xl md:text-3xl font-bold text-navy">
              {menu.price}
              <span className="text-sm font-bold ml-0.5">万円</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-1 max-w-[55%]">
            {menu.stack.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] bg-navy/5 text-navy/70 rounded-full px-2 py-0.5"
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
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-navy/15 hover:border-navy py-2.5 text-xs md:text-sm font-bold text-navy transition"
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
            <div className="border-t border-navy/10 bg-paper p-5 md:p-6 text-sm space-y-4">
              <Detail label="納品物" body={menu.deliverable} />
              <Detail label="完了基準" body={menu.completionCriteria} highlight />
              <Detail label="運用条件" body={menu.conditions} />
              <div className="flex items-center justify-between pt-2 text-xs text-navy/60">
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
          highlight ? "text-gold" : "text-navy/50",
        )}
      >
        <span className="inline-flex items-center gap-1">
          {highlight && <Plus size={12} />}
          {label}
        </span>
      </div>
      <p className="text-navy/80 leading-relaxed">{body}</p>
    </div>
  );
}
