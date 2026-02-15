'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SearchType = 'all' | 'content' | 'prediction' | 'source';

interface SearchResultItem {
  id: string;
  type: 'content' | 'analysis' | 'prediction' | 'source';
  title: string;
  summary: string | null;
  source_id: string | null;
  content_id: string | null;
  similarity: number;
  source_name?: string;
  source_slug?: string;
}

interface SearchModalProps {
  onClose: () => void;
}

const TYPE_LABELS: Record<SearchType, string> = {
  all: 'All',
  content: 'Content',
  prediction: 'Predictions',
  source: 'Sources',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  content: 'var(--accent)',
  analysis: 'var(--accent)',
  prediction: '#22C55E',
  source: '#888888',
};

export default function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SearchType>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (q: string, type: SearchType) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q, limit: '20', threshold: '0.2' });
      if (type !== 'all') params.set('type', type === 'content' ? 'content' : type);
      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, typeFilter), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, typeFilter, search]);

  function navigateToResult(result: SearchResultItem) {
    if (result.type === 'content' || result.type === 'analysis') {
      const id = result.type === 'analysis' ? result.content_id : result.id;
      if (id) router.push(`/content/${id}`);
    } else if (result.type === 'prediction') {
      router.push('/predictions');
    } else if (result.type === 'source' && result.source_slug) {
      router.push(`/sources/${result.source_slug}`);
    }
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigateToResult(results[selectedIndex]);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(0, 0, 0, 0.7)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 560,
          maxHeight: 'calc(100vh - 160px)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search intelligence..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 15,
              fontFamily: 'var(--font-main)',
            }}
          />
          <kbd style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
          }}>
            ESC
          </kbd>
        </div>

        {/* Type filter tabs */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-1)',
          padding: 'var(--space-2) var(--space-4)',
          borderBottom: '1px solid var(--border)',
        }}>
          {(Object.keys(TYPE_LABELS) as SearchType[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: typeFilter === type ? 'var(--accent-dim)' : 'transparent',
                color: typeFilter === type ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-main)',
                transition: 'all 0.15s ease',
              }}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}>
          {loading && (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Searching...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No results found</span>
            </div>
          )}

          {!loading && results.map((result, i) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => navigateToResult(result)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: i === selectedIndex ? 'var(--bg-surface)' : 'transparent',
                transition: 'background 0.1s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {/* Type badge */}
              <span style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: `${TYPE_BADGE_COLORS[result.type]}20`,
                color: TYPE_BADGE_COLORS[result.type],
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}>
                {result.type}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {result.title}
                </div>
                {result.summary && (
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {result.summary.slice(0, 120)}
                  </div>
                )}
                {result.source_name && (
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                    marginTop: 2,
                    display: 'inline-block',
                  }}>
                    {result.source_name}
                  </span>
                )}
              </div>

              {/* Similarity */}
              <span className="mono" style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}>
                {Math.round(result.similarity * 100)}%
              </span>
            </div>
          ))}

          {!query && (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Type to search across all intelligence...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
