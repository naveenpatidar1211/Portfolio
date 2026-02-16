import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Naveen Patidar - Full Stack Developer',
  description: 'Portfolio of Naveen Patidar, a passionate Full Stack Developer specializing in modern web technologies.',
  keywords: 'Naveen Patidar, Full Stack Developer, React, Node.js, TypeScript, Portfolio',
  authors: [{ name: 'Naveen Patidar' }],
  openGraph: {
    title: 'Naveen Patidar - Full Stack Developer',
    description: 'Portfolio of Naveen Patidar, a passionate Full Stack Developer',
    url: 'https://dev-Naveen Patidark.github.io',
    siteName: 'Naveen Patidar Portfolio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Naveen Patidar - Full Stack Developer',
    description: 'Portfolio of Naveen Patidar, a passionate Full Stack Developer',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
