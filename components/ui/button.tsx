import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-vermilion text-white shadow-[0_10px_30px_-10px_rgba(200,16,46,0.6)] hover:bg-vermilion-600 hover:shadow-[0_14px_40px_-10px_rgba(200,16,46,0.7)] hover:-translate-y-0.5 active:translate-y-0",
        gold: "bg-gradient-to-r from-gold to-gold-300 text-navy shadow-gold hover:shadow-[0_14px_40px_-10px_rgba(201,169,75,0.7)] hover:-translate-y-0.5 active:translate-y-0",
        navy: "bg-navy text-white shadow-soft hover:bg-navy-700 hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border-2 border-navy text-navy bg-white/70 backdrop-blur hover:bg-navy hover:text-white",
        outlineLight:
          "border-2 border-white/80 text-white bg-transparent backdrop-blur hover:bg-white hover:text-navy",
        ghost: "text-navy hover:bg-navy-50",
        line: "bg-[#06C755] text-white shadow-soft hover:brightness-110 hover:-translate-y-0.5",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-6 text-sm md:text-base",
        lg: "h-14 px-7 text-base md:text-lg",
        xl: "h-16 px-8 text-base md:text-lg tracking-wide",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

type ButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof buttonVariants>;

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
ButtonLink.displayName = "ButtonLink";

export { buttonVariants };
