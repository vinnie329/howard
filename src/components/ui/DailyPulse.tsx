'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  ago: string;
  tickers: string[];
}

interface PulseSlide {
  headline: string;
  publisher: string;
  ago: string;
  tickers: string[];
}

const FALLBACK: PulseSlide[] = [
  {
    headline: 'Loading market headlines...',
    publisher: '',
    ago: '',
    tickers: [],
  },
];

const DURATION = 8000;

export default function DailyPulse() {
  const [slides, setSlides] = useState<PulseSlide[]>(FALLBACK);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Fetch news on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/news')
      .then((res) => res.json())
      .then((data: NewsItem[]) => {
        if (!cancelled && data.length > 0) {
          setSlides(data.map((n) => ({
            headline: n.title,
            publisher: n.publisher,
            ago: n.ago,
            tickers: n.tickers,
          })));
          setIndex(0);
        }
      })
      .catch(() => {
        // Keep fallback
      });
    return () => { cancelled = true; };
  }, []);

  const slide = slides[index];

  const resetProgress = useCallback(() => {
    const bar = progressRef.current;
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.transition = `width ${DURATION}ms linear`;
    bar.style.width = '100%';
  }, []);

  const goTo = useCallback((next: number) => {
    setVisible(false);
    setTimeout(() => {
      setIndex(next);
      setVisible(true);
    }, 180);
  }, []);

  const next = useCallback(() => {
    goTo((index + 1) % slides.length);
  }, [index, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((index - 1 + slides.length) % slides.length);
  }, [index, slides.length, goTo]);

  // Auto-advance timer (pauses on hover)
  useEffect(() => {
    if (paused) {
      const bar = progressRef.current;
      if (bar) {
        const w = bar.getBoundingClientRect().width;
        const parentW = bar.parentElement?.getBoundingClientRect().width ?? 1;
        bar.style.transition = 'none';
        bar.style.width = `${(w / parentW) * 100}%`;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    resetProgress();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      goTo((index + 1) % slides.length);
    }, DURATION);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index, slides.length, goTo, resetProgress, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        marginBottom: 'var(--space-6)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span className="label">Daily Pulse</span>
        </div>
        <div style={{
          width: 64,
          height: 3,
          background: 'var(--bg-surface)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div
            ref={progressRef}
            style={{
              height: '100%',
              background: 'var(--text-tertiary)',
              borderRadius: 2,
              width: '0%',
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left sidebar */}
        <div style={{
          width: '30%',
          borderRight: '1px solid var(--border)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          background: 'var(--bg-surface)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        }}>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Source</div>
            <div style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
              color: 'var(--text-primary)',
            }}>
              {slide.publisher}
            </div>
          </div>
          {slide.tickers.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Related</div>
              <div className="mono" style={{
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.5,
                color: 'var(--accent)',
              }}>
                {slide.tickers.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Right content */}
        <div style={{
          width: '70%',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 180ms ease-out, transform 180ms ease-out',
          }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Headlines</div>
            <div style={{
              fontSize: 16,
              lineHeight: 1.4,
              color: 'var(--text-primary)',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}>
              {slide.headline}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'var(--space-3)',
            marginTop: 'var(--space-4)',
          }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 180ms ease-out',
              }}
            >
              {slide.ago}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {/* Pagination dots */}
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { if (i !== index) goTo(i); }}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      background: i === index ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      transform: i === index ? 'scale(1.3)' : 'scale(1)',
                      transition: 'all 200ms ease',
                    }}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                paddingLeft: 'var(--space-3)',
                borderLeft: '1px solid var(--border)',
              }}>
                <button
                  onClick={prev}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 'var(--space-1)',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    borderRadius: '50%',
                    transition: 'color 150ms ease, background 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
                    <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 'var(--space-1)',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    borderRadius: '50%',
                    transition: 'color 150ms ease, background 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
                    <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
