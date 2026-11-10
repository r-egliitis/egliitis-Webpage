import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  target?: string;
  rel?: string;
};

export function Button({
  href,
  children,
  variant = "primary",
  target,
  rel,
}: ButtonProps) {
  const base =
    "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-[0.9375rem] font-medium transition-[box-shadow,border-color,color] duration-300";
  const styles =
    variant === "primary"
      ? "bg-fg text-surface hover:shadow-[0_0_28px_var(--glow)]"
      : "border border-line text-fg hover:border-fg hover:shadow-[0_0_24px_var(--glow-soft)]";

  return (
    <a href={href} target={target} rel={rel} className={`${base} ${styles}`}>
      {children}
    </a>
  );
}
