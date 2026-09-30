import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

const buttonBase =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:border-foreground/25",
  /** For use on the solid primary band in the closing section. */
  inverse: "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
} as const;

/** Button classes, for anchors and buttons that can't use ButtonLink (external links, actions). */
export function buttonClasses(variant: keyof typeof buttonVariants = "primary", className?: string) {
  return cn(buttonBase, buttonVariants[variant], className);
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}

export function SectionTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2 className={cn("text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-balance text-foreground md:text-4xl md:leading-tight", className)}>
      {children}
    </h2>
  );
}

export function Lead({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("max-w-[60ch] text-base leading-relaxed text-muted-foreground text-pretty md:text-lg", className)}>{children}</p>;
}

/** Brand marks in /public/landing/logos, with each file's aspect ratio. */
export const LOGOS = {
  bitrix24: { label: "Bitrix24", ratio: 195 / 35 },
  "1c": { label: "1C", ratio: 489.76 / 238.86 },
  googledrive: { label: "Google Drive", ratio: 1 },
  confluence: { label: "Confluence", ratio: 1 },
  gmail: { label: "Gmail", ratio: 1 },
  telegram: { label: "Telegram", ratio: 1 },
  opencart: { label: "OpenCart", ratio: 400 / 78 },
} as const;

export type LogoId = keyof typeof LOGOS;

/** Single-color brand logo that takes the current text color. Size it with a height class. */
export function BrandLogo({ id, className, decorative = false }: { id: LogoId; className?: string; decorative?: boolean }) {
  const logo = LOGOS[id];
  const style = { "--logo": `url(/landing/logos/${id}.svg)`, aspectRatio: logo.ratio } as CSSProperties;
  return (
    <span
      className={cn("wl-logo", className)}
      style={style}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": logo.label })}
    />
  );
}
