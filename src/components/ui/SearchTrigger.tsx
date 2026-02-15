'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SearchModal from './SearchModal';

interface SearchContextValue {
  openSearch: () => void;
  closeSearch: () => void;
}

const SearchContext = createContext<SearchContextValue>({
  openSearch: () => {},
  closeSearch: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SearchContext.Provider value={{ openSearch, closeSearch }}>
      {children}
      {isOpen && <SearchModal onClose={closeSearch} />}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
