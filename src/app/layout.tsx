import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/ui/Sidebar';
import TickerTape from '@/components/ui/TickerTape';
import MainArea from '@/components/ui/MainArea';
import { DomainFilterProvider } from '@/lib/domain-filter-context';
import { SearchProvider } from '@/components/ui/SearchTrigger';
import { TransitionProvider } from '@/lib/transition-context';

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
        <TransitionProvider>
          <DomainFilterProvider>
            <SearchProvider>
              <div className="app-layout">
                <TickerTape />
                <div className="app-body">
                  <Sidebar />
                  <MainArea>{children}</MainArea>
                </div>
              </div>
            </SearchProvider>
          </DomainFilterProvider>
        </TransitionProvider>
      </body>
    </html>
  );
}
