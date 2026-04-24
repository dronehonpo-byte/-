"use client";

import * as React from "react";
import {
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
  motion,
} from "framer-motion";

type CountUpProps = {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
};

export function CountUp({
  to,
  duration = 1.4,
  format = (n) => Math.round(n).toLocaleString("ja-JP"),
  className,
}: CountUpProps) {
  const prefersReducedMotion = useReducedMotion();
  const mv = useMotionValue(prefersReducedMotion ? to : 0);
  const rounded = useTransform(mv, (n) => format(n));

  React.useEffect(() => {
    if (prefersReducedMotion) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [to, duration, mv, prefersReducedMotion]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
