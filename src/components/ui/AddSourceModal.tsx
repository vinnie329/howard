'use client';

import { useState } from 'react';
import { DIMENSION_LABELS } from '@/lib/scoring';
import { DOMAINS } from '@/types';
import type { CredibilityDimension } from '@/types';

const dimensionKeys = Object.keys(DIMENSION_LABELS) as CredibilityDimension[];

interface AddSourceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSourceModal({ onClose, onSuccess }: AddSourceModalProps) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<CredibilityDimension, number>>(
    Object.fromEntries(dimensionKeys.map((k) => [k, 3])) as Record<CredibilityDimension, number>
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleDomain(domain: string) {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  }

  function setScore(key: CredibilityDimension, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDomains.length === 0) {
      setError('Select at least one domain');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio,
          domains: selectedDomains,
          scores,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add source');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font-main)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-1)',
    display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        width: 520,
        maxHeight: '85vh',
        overflowY: 'auto',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
        }}>
          <h2>Add Source</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: 18,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Howard Marks"
              style={inputStyle}
            />
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Brief description of background and expertise"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-main)' }}
            />
          </div>

          {/* Domains */}
          <div>
            <label style={labelStyle}>Domains</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {DOMAINS.map((domain) => {
                const active = selectedDomains.includes(domain);
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => toggleDomain(domain)}
                    style={{
                      fontSize: 11,
                      padding: 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      background: active ? 'var(--accent-dim)' : 'var(--bg-surface)',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'var(--accent-dim)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {domain}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credibility Scores */}
          <div>
            <label style={labelStyle}>Credibility Scores (1-5)</label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-2)',
            }}>
              {dimensionKeys.map((key) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 160, flexShrink: 0 }}>
                    {DIMENSION_LABELS[key]}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScore(key, n)}
                        style={{
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${scores[key] === n ? 'var(--accent)' : 'var(--border)'}`,
                          background: scores[key] === n ? 'var(--accent-dim)' : 'var(--bg-surface)',
                          color: scores[key] === n ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
