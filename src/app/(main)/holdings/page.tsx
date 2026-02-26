'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFunds, getHoldings, getFilingDates } from '@/lib/data';
import type { Fund, Holding } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatShares(n: number): string {
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function quarterLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

type ViewMode = 'by-fund' | 'overlap';

export default function HoldingsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [filingDates, setFilingDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('by-fund');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial load
  useEffect(() => {
    Promise.all([getFunds(), getFilingDates()]).then(([f, d]) => {
      setFunds(f);
      setFilingDates(d);
      if (d.length > 0) setSelectedDate(d[0]);
      setLoading(false);
    });
  }, []);

  // Load holdings when filters change
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    const fundId = selectedFund === 'all' ? undefined : selectedFund;
    getHoldings(fundId, selectedDate).then((h) => {
      setHoldings(h);
      setLoading(false);
    });
  }, [selectedFund, selectedDate]);

  // Update filing dates when fund filter changes
  useEffect(() => {
    const fundId = selectedFund === 'all' ? undefined : selectedFund;
    getFilingDates(fundId).then((d) => {
      setFilingDates(d);
      if (d.length > 0 && !d.includes(selectedDate)) {
        setSelectedDate(d[0]);
      }
    });
  }, [selectedFund]);

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return holdings;
    const q = searchQuery.toLowerCase();
    return holdings.filter(
      (h) =>
        (h.ticker && h.ticker.toLowerCase().includes(q)) ||
        h.company_name.toLowerCase().includes(q) ||
        h.cusip.toLowerCase().includes(q)
    );
  }, [holdings, searchQuery]);

  // Overlap view: group by ticker across funds
  const overlapData = useMemo(() => {
    if (viewMode !== 'overlap') return [];

    const byTicker = new Map<string, { ticker: string; company_name: string; funds: Map<string, Holding[]> }>();

    for (const h of searchFiltered) {
      const key = h.ticker || h.cusip;
      if (!byTicker.has(key)) {
        byTicker.set(key, { ticker: key, company_name: h.company_name, funds: new Map() });
      }
      const entry = byTicker.get(key)!;
      if (!entry.funds.has(h.fund_id)) {
        entry.funds.set(h.fund_id, []);
      }
      entry.funds.get(h.fund_id)!.push(h);
    }

    return Array.from(byTicker.values())
      .sort((a, b) => {
        // Sort by number of funds holding (multi-fund first), then by total value
        const aFunds = a.funds.size;
        const bFunds = b.funds.size;
        if (aFunds !== bFunds) return bFunds - aFunds;
        const aVal = Array.from(a.funds.values()).flat().reduce((s, h) => s + h.value, 0);
        const bVal = Array.from(b.funds.values()).flat().reduce((s, h) => s + h.value, 0);
        return bVal - aVal;
      });
  }, [searchFiltered, viewMode]);

  const multiFundCount = overlapData.filter((d) => d.funds.size > 1).length;

  // Stats
  const totalValue = searchFiltered.reduce((s, h) => s + h.value, 0);
  const totalPositions = searchFiltered.length;
  const uniqueTickers = new Set(searchFiltered.map((h) => h.ticker || h.cusip)).size;

  const getFundName = (fundId: string) => funds.find((f) => f.id === fundId)?.name || fundId;

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>13F Holdings</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>13F Holdings</h1>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
          Institutional positions from SEC 13F filings
        </p>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Fund filter */}
          <select
            value={selectedFund}
            onChange={(e) => setSelectedFund(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 12,
              padding: 'var(--space-2) var(--space-3)',
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Funds</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Quarter filter */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 12,
              padding: 'var(--space-2) var(--space-3)',
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            {filingDates.map((d) => (
              <option key={d} value={d}>
                {quarterLabel(d)}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="filter-tabs" style={{ marginBottom: 0 }}>
            <button
              className={`filter-tab ${viewMode === 'by-fund' ? 'active' : ''}`}
              onClick={() => setViewMode('by-fund')}
            >
              By Fund
            </button>
            <button
              className={`filter-tab ${viewMode === 'overlap' ? 'active' : ''}`}
              onClick={() => setViewMode('overlap')}
            >
              Overlap
            </button>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginLeft: 'auto',
            minWidth: 180,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker or name..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'var(--font-main)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
          <Stat label="Total Value" value={formatValue(totalValue)} />
          <Stat label="Positions" value={String(totalPositions)} />
          <Stat label="Unique Names" value={String(uniqueTickers)} />
          {viewMode === 'overlap' && multiFundCount > 0 && (
            <Stat label="Multi-Fund" value={String(multiFundCount)} accent />
          )}
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonRows count={8} />
        ) : viewMode === 'by-fund' ? (
          <FundView
            holdings={searchFiltered}
            funds={funds}
            selectedFund={selectedFund}
          />
        ) : (
          <OverlapView
            data={overlapData}
            funds={funds}
            expandedTicker={expandedTicker}
            onToggle={(t) => setExpandedTicker(expandedTicker === t ? null : t)}
            getFundName={getFundName}
          />
        )}

        <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
          {selectedDate && `Filing period: ${formatDate(selectedDate)}`}
          {' \u00B7 '}
          Source: SEC EDGAR 13F-HR filings
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function ChangeIndicator({ change, changeType }: { change: number; changeType: string }) {
  if (changeType === 'new') {
    return <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>NEW</span>;
  }
  if (changeType === 'increased') {
    return <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>+{formatShares(change)}</span>;
  }
  if (changeType === 'decreased') {
    return <span style={{ fontSize: 10, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{formatShares(change)}</span>;
  }
  if (changeType === 'sold') {
    return <span style={{ fontSize: 10, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>SOLD</span>;
  }
  return <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>--</span>;
}

function OptionBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <span style={{
      fontSize: 9,
      padding: '1px 4px',
      borderRadius: 2,
      background: type === 'put' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
      color: type === 'put' ? '#ef4444' : 'var(--green)',
      fontFamily: 'var(--font-mono)',
      marginLeft: 4,
      textTransform: 'uppercase',
    }}>
      {type}
    </span>
  );
}

const gridCols = '80px 1.5fr 100px 120px 100px 90px';

function FundView({ holdings, funds, selectedFund }: { holdings: Holding[]; funds: Fund[]; selectedFund: string }) {
  // Group by fund if showing all
  const showFundColumn = selectedFund === 'all' && funds.length > 1;
  const cols = showFundColumn ? '80px 1fr 120px 100px 120px 100px 90px' : gridCols;

  if (holdings.length === 0) {
    return (
      <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
        No holdings found.
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: cols,
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="label">Ticker</span>
        <span className="label">Company</span>
        {showFundColumn && <span className="label">Fund</span>}
        <span className="label" style={{ textAlign: 'right' }}>Value</span>
        <span className="label" style={{ textAlign: 'right' }}>Shares</span>
        <span className="label" style={{ textAlign: 'right' }}>Change</span>
        <span className="label" style={{ textAlign: 'right' }}>% of Port</span>
      </div>

      {/* Rows */}
      <div className="stagger-in">
        {holdings.map((h) => {
          const portfolioTotal = holdings
            .filter((x) => x.fund_id === h.fund_id)
            .reduce((s, x) => s + x.value, 0);
          const pct = portfolioTotal > 0 ? ((h.value / portfolioTotal) * 100).toFixed(1) : '0.0';
          const fundName = funds.find((f) => f.id === h.fund_id)?.name || '';

          return (
            <div
              key={h.id}
              style={{
                display: 'grid',
                gridTemplateColumns: cols,
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {h.ticker || h.cusip.slice(0, 6)}
                </span>
                <OptionBadge type={h.option_type} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.company_name}
              </span>
              {showFundColumn && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fundName}
                </span>
              )}
              <span className="mono" style={{ fontSize: 11, textAlign: 'right' }}>{formatValue(h.value)}</span>
              <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatShares(h.shares)}</span>
              <div style={{ textAlign: 'right' }}>
                <ChangeIndicator change={h.share_change} changeType={h.change_type} />
              </div>
              <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--text-secondary)' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverlapView({
  data,
  funds,
  expandedTicker,
  onToggle,
  getFundName,
}: {
  data: { ticker: string; company_name: string; funds: Map<string, Holding[]> }[];
  funds: Fund[];
  expandedTicker: string | null;
  onToggle: (ticker: string) => void;
  getFundName: (id: string) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
        No holdings found.
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 1.5fr 1fr 100px 100px',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="label">Ticker</span>
        <span className="label">Company</span>
        <span className="label">Held By</span>
        <span className="label" style={{ textAlign: 'right' }}>Total Value</span>
        <span className="label" style={{ textAlign: 'right' }}>Total Shares</span>
      </div>

      <div className="stagger-in">
        {data.map(({ ticker, company_name, funds: fundMap }) => {
          const isMultiFund = fundMap.size > 1;
          const allHoldings = Array.from(fundMap.values()).flat();
          const totalVal = allHoldings.reduce((s, h) => s + h.value, 0);
          const totalShares = allHoldings.reduce((s, h) => s + h.shares, 0);
          const isExpanded = expandedTicker === ticker;

          return (
            <div key={ticker}>
              <div
                onClick={() => onToggle(ticker)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1.5fr 1fr 100px 100px',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                  background: isExpanded ? 'var(--bg-surface)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-surface)'; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {ticker}
                  </span>
                  {/* Show option types if any */}
                  {allHoldings.some((h) => h.option_type) && (
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 4 }}>*</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {company_name}
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                  {Array.from(fundMap.keys()).map((fid) => (
                    <span
                      key={fid}
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-pill)',
                        background: isMultiFund ? 'var(--accent-dim)' : 'var(--bg-surface)',
                        color: isMultiFund ? 'var(--accent)' : 'var(--text-secondary)',
                        border: `1px solid ${isMultiFund ? 'var(--accent)' : 'var(--border)'}`,
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getFundName(fid)}
                    </span>
                  ))}
                </div>
                <span className="mono" style={{ fontSize: 11, textAlign: 'right' }}>{formatValue(totalVal)}</span>
                <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatShares(totalShares)}</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  {Array.from(fundMap.entries()).map(([fid, fHoldings]) => (
                    <div key={fid} style={{ marginBottom: fHoldings === Array.from(fundMap.values()).pop() ? 0 : 'var(--space-3)' }}>
                      <div className="label" style={{ marginBottom: 'var(--space-1)' }}>
                        {getFundName(fid)}
                      </div>
                      {fHoldings.map((h) => (
                        <div
                          key={h.id}
                          style={{
                            display: 'flex',
                            gap: 'var(--space-4)',
                            alignItems: 'center',
                            padding: '2px 0',
                          }}
                        >
                          <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 60 }}>
                            {formatValue(h.value)}
                          </span>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 90 }}>
                            {formatShares(h.shares)} shs
                          </span>
                          <OptionBadge type={h.option_type} />
                          <ChangeIndicator change={h.share_change} changeType={h.change_type} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
