'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getContentWithAnalysis,
  getOutlook,
  getOutlookHistory,
  getTrendingTopics,
  getPredictions,
} from '@/lib/data';
import type {
  ContentWithAnalysis,
  Outlook,
  OutlookHistory,
  TrendingTopic,
  Prediction,
} from '@/types';

/* ---- Data hook ---- */

export interface BriefingData {
  content: ContentWithAnalysis[];
  outlooks: Outlook[];
  history: OutlookHistory[];
  trending: TrendingTopic[];
  predictions: Prediction[];
  loading: boolean;
}

export function useBriefingData(): BriefingData {
  const [data, setData] = useState<BriefingData>({
    content: [],
    outlooks: [],
    history: [],
    trending: [],
    predictions: [],
    loading: true,
  });

  const load = useCallback(async () => {
    const [contentResult, outlooks, history, trending, predictions] = await Promise.all([
      getContentWithAnalysis(1, 10),
      getOutlook(),
      getOutlookHistory(5),
      getTrendingTopics(),
      getPredictions(),
    ]);
    setData({
      content: contentResult.items,
      outlooks,
      history: history.filter((h) => h.changes_summary.length > 0),
      trending,
      predictions,
      loading: false,
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  return data;
}

/* ---- Helpers ---- */

export function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3.6e6);
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export const sentimentColor: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  cautious: '#f59e0b',
  neutral: '#666',
  mixed: '#888',
};

export const horizonLabel: Record<string, string> = {
  short: 'Short-term',
  medium: 'Medium-term',
  long: 'Long-term',
};

/* ---- Tokens ---- */

export const t = {
  bg: '#050505',
  surface: '#0a0a0a',
  card: '#0e0e0e',
  border: '#1a1a1a',
  borderLight: '#262626',
  text: '#ededed',
  text2: '#888',
  text3: '#555',
  accent: '#FF4800',
  radius: 12,
  radiusSm: 8,
  font: 'var(--font-main, -apple-system, sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", monospace)',
};
