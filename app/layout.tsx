import type React from "react"
import type { Metadata, Viewport } from "next"
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "UniAPI · Gateway Analytics",
  description: "Usage analytics, channel health, and live request logs for your UniAPI gateway.",
  icons: {
    icon: "https://raw.githubusercontent.com/yym68686/uni-api/refs/heads/main/static/favicon.ico",
    apple: "https://raw.githubusercontent.com/yym68686/uni-api/refs/heads/main/static/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${hanken.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
