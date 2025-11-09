import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { SyncOnStart } from '@/components/sync-on-start'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MyGuests - Rental Management',
  description: 'Manage your short-term rental properties with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <SyncOnStart />
          {children}
        </Providers>
      </body>
    </html>
  )
} 