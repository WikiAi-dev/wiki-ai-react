"use client"

import type { CSSProperties, ReactNode } from "react"
import { Check } from "lucide-react"
import { Nav } from "@/app/landing/_components/nav"
import { Footer } from "@/app/landing/_components/closing"
import { MotionRoot } from "@/app/landing/_components/motion"
import { Container } from "@/app/landing/_components/primitives"

const delay = (ms: number) => ({ "--wl-delay": `${ms}ms` }) as CSSProperties

/**
 * Sign-in, invitation and access pages: the site nav, a short explanation on
 * the left, one card on the right, and the thin copyright bar. Sized to fit
 * one screen on common displays. Pages using it import app/landing/landing.css.
 */
export function AuthLayout({
  title,
  subtitle,
  points,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  points?: string[]
  children: ReactNode
}) {
  return (
    <MotionRoot>
      <div className="wl flex min-h-[100dvh] flex-col bg-background font-sans text-foreground antialiased">
        <Nav showCta={false} />
        <main className="flex flex-1 items-center">
          <Container className="grid w-full items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-20 lg:py-10">
            <div className="max-lg:text-center">
              <h1 className="wl-enter text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
                {title}
              </h1>
              {subtitle && (
                <p
                  className="wl-enter mx-auto mt-3 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground text-pretty sm:text-base md:mt-5 md:text-lg lg:mx-0"
                  style={delay(80)}
                >
                  {subtitle}
                </p>
              )}
              {points && points.length > 0 && (
                <ul className="wl-enter mt-8 hidden flex-col gap-3 lg:flex" style={delay(160)}>
                  {points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-[15px] text-foreground">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="wl-enter mx-auto w-full max-w-md" style={delay(120)}>
              {children}
            </div>
          </Container>
        </main>
        <Footer compact />
      </div>
    </MotionRoot>
  )
}

/** The card that holds an auth form. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_32px_64px_-40px_var(--wl-shadow)] sm:p-7">{children}</div>
  )
}
