import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Network Element Monitor',
  description: 'Real-time network element monitoring portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
