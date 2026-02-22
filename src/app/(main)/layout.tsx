import Sidebar from '@/components/ui/Sidebar';
import TickerTape from '@/components/ui/TickerTape';
import MainArea from '@/components/ui/MainArea';
import { DomainFilterProvider } from '@/lib/domain-filter-context';
import { SearchProvider } from '@/components/ui/SearchTrigger';
import { TransitionProvider } from '@/lib/transition-context';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
