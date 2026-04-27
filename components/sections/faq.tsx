"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Section } from "../ui/section";
import { faqItems } from "@/lib/content";

export function Faq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <Section
      id="faq"
      tone="white"
      eyebrow="FAQ"
      heading="よくあるご質問"
      lead="契約・料金・保守について、経営者の方から特に多くいただく質問にお答えします。"
    >
      <div className="mx-auto max-w-3xl divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white overflow-hidden">
        {faqItems.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={i}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full flex items-start justify-between gap-4 text-left px-5 md:px-7 py-5 md:py-6 hover:bg-paper transition"
                >
                  <span className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <span className="font-en text-accent text-sm md:text-base font-bold shrink-0 mt-0.5">
                      Q{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm md:text-base font-bold text-ink leading-snug">
                      {item.q}
                    </span>
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-ink/60 transition-transform shrink-0 mt-1 ${
                      open ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    id={`faq-panel-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden bg-paper"
                  >
                    <div className="px-5 md:px-7 pb-6 md:pb-7 pt-4">
                      <div className="flex gap-3 md:gap-4">
                        <span className="font-en text-ink/40 text-sm md:text-base font-bold shrink-0 mt-0.5">
                          A
                        </span>
                        <p className="text-sm md:text-base text-ink/80 leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
