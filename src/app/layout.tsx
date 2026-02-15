import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/ui/Sidebar';
import TickerTape from '@/components/ui/TickerTape';
import { DomainFilterProvider } from '@/lib/domain-filter-context';
import { SearchProvider } from '@/components/ui/SearchTrigger';

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
          <SearchProvider>
            <div className="app-layout">
              <TickerTape />
              <div className="app-body">
                <Sidebar />
                <div className="main-area">
                  {children}
                </div>
              </div>
            </div>
          </SearchProvider>
        </DomainFilterProvider>
      </body>
    </html>
  );
}
