import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import "./globals.css"

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "音上げ (NeAge)",
  description: "歌詞タイピング × ハンドジェスチャー アクションゲーム",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${mono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  )
}
