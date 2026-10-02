import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import HydrationCleanup from "./components/hydration-cleanup"
import Script from "next/script"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WikiAI — база знаний компании",
  description:
    "WikiAI собирает данные из Битрикс24, 1С, документов и других систем в одну базу знаний и отвечает сотрудникам со ссылкой на источник.",
}

// Vercel Analytics only exists on Vercel; self-hosted builds would request a
// script that 404s on every page.
const onVercel = Boolean(process.env.VERCEL)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${_geist.className} ${_geistMono.className}`}>
      <head>
        <Script
          src="/pre-hydration.js"
          strategy="beforeInteractive"
        />
      </head>
      {/* Both fonts' className are applied on <html> only so their @font-face
          rules load (font-mono is used deliberately in ~20 places for
          code/data). Geist Mono's className directly sets font-family, which
          previously also landed on <body> alongside the font-sans utility —
          same specificity, so source order silently made Geist Mono the
          rendered default for the entire app. Applying font-sans directly on
          body (with no competing className) makes it authoritative again. */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <HydrationCleanup />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        {onVercel && <Analytics />}
      </body>
    </html>
  )
}
