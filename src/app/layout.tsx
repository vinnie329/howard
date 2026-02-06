import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/ui/Sidebar';
import TickerTape from '@/components/ui/TickerTape';
import { DomainFilterProvider } from '@/lib/domain-filter-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-main',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Howard — Financial Intelligence Tracker',
  description: 'Monitor trusted sources across YouTube and Substack for market sentiment and emerging narratives.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <DomainFilterProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-area">
              <TickerTape />
              {children}
            </div>
          </div>
        </DomainFilterProvider>
      </body>
    </html>
  );
}
