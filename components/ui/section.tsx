import * as React from "react";
import { cn } from "@/lib/utils";

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  id?: string;
  eyebrow?: string;
  heading?: React.ReactNode;
  lead?: React.ReactNode;
  tone?: "paper" | "white" | "navy";
  align?: "center" | "left";
};

export function Section({
  id,
  eyebrow,
  heading,
  lead,
  tone = "paper",
  align = "center",
  className,
  children,
  ...props
}: SectionProps) {
  const bg =
    tone === "navy"
      ? "bg-navy text-white"
      : tone === "white"
        ? "bg-white"
        : "bg-paper";
  const textAlign = align === "center" ? "text-center items-center" : "";

  return (
    <section
      id={id}
      className={cn("relative py-20 md:py-28", bg, className)}
      {...props}
    >
      <div className="container">
        {(eyebrow || heading || lead) && (
          <div className={cn("mx-auto max-w-3xl mb-12 md:mb-16 flex flex-col gap-4", textAlign)}>
            {eyebrow && (
              <div
                className={cn(
                  "text-[11px] md:text-xs tracking-[0.22em] font-bold uppercase",
                  tone === "navy" ? "text-accent" : "text-navy",
                )}
              >
                {eyebrow}
              </div>
            )}
            {heading && (
              <h2 className="heading-xl text-2xl md:text-4xl lg:text-[44px] leading-[1.25]">
                {heading}
              </h2>
            )}
            {lead && (
              <p className="text-jp text-sm md:text-base opacity-75">{lead}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
