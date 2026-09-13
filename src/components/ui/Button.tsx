"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger-ghost";
type Size = "sm" | "md";

const variantClass: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:opacity-90",
  accent: "bg-accent text-background hover:brightness-110",
  secondary: "border border-border bg-surface-2 text-foreground hover:border-muted",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2/60",
  "danger-ghost": "border border-border bg-surface-2 text-muted hover:text-danger hover:border-danger/40",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        disabled={disabled}
        className={clsx(
          "inline-flex items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
          variantClass[variant],
          sizeClass[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
