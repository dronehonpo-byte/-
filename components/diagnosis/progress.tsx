"use client";

import { motion } from "framer-motion";

export function DiagnosisProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div>
      <div className="flex justify-between text-[11px] md:text-xs font-bold text-ink/60 mb-2">
        <span>
          STEP <span className="text-ink font-en">{current}</span> / {total}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div
        className="relative h-1.5 w-full rounded-full bg-ink/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
