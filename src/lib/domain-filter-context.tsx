'use client';

import { createContext, useContext, useState } from 'react';
import type { Domain } from '@/types';

interface DomainFilterContextValue {
  selectedDomains: Domain[];
  toggle: (domain: Domain) => void;
  clear: () => void;
}

const DomainFilterContext = createContext<DomainFilterContextValue>({
  selectedDomains: [],
  toggle: () => {},
  clear: () => {},
});

export function DomainFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);

  function toggle(domain: Domain) {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  }

  function clear() {
    setSelectedDomains([]);
  }

  return (
    <DomainFilterContext.Provider value={{ selectedDomains, toggle, clear }}>
      {children}
    </DomainFilterContext.Provider>
  );
}

export function useDomainFilter() {
  return useContext(DomainFilterContext);
}
