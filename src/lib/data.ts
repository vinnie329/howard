import { getSupabaseClient } from './supabase';
import type { Source, ContentWithAnalysis, Prediction, Outlook, OutlookHistory, TrendingTopic } from '@/types';
import {
  mockSources,
  mockContentWithAnalysis,
  mockPredictions,
  mockOutlook,
  mockTrendingTopics,
} from './mock-data';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getSources(): Promise<Source[]> {
  if (!hasSupabase) return mockSources;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .order('weighted_score', { ascending: false });

    if (error || !data || data.length === 0) return mockSources;

    return data.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      bio: s.bio || '',
      avatar_url: s.avatar_url || '',
      domains: s.domains as string[],
      scores: s.scores as Source['scores'],
      weighted_score: s.weighted_score,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
  } catch {
    return mockSources;
  }
}

export async function getContentWithAnalysis(
  page: number = 1,
  limit: number = 20,
): Promise<{ items: ContentWithAnalysis[]; hasMore: boolean }> {
  if (!hasSupabase) {
    const from = (page - 1) * limit;
    const sliced = mockContentWithAnalysis.slice(from, from + limit + 1);
    const hasMore = sliced.length > limit;
    if (hasMore) sliced.pop();
    return { items: sliced, hasMore };
  }

  try {
    const supabase = getSupabaseClient();
    const from = (page - 1) * limit;

    // Fetch content with joined source (limit+1 to detect hasMore)
    const { data: contentRows, error: contentError } = await supabase
      .from('content')
      .select('*, sources(*)')
      .order('published_at', { ascending: false })
      .range(from, from + limit);

    if (contentError || !contentRows || contentRows.length === 0) {
      const mockFrom = (page - 1) * limit;
      const mockSliced = mockContentWithAnalysis.slice(mockFrom, mockFrom + limit + 1);
      const mockHasMore = mockSliced.length > limit;
      if (mockHasMore) mockSliced.pop();
      return { items: mockSliced, hasMore: mockHasMore };
    }

    const hasMore = contentRows.length > limit;
    if (hasMore) contentRows.pop();

    // Fetch analyses for these content items
    const contentIds = contentRows.map((c) => c.id);
    const { data: analyses } = await supabase
      .from('analyses')
      .select('*')
      .in('content_id', contentIds);

    const analysisMap = new Map(
      (analyses || []).map((a) => [a.content_id, a])
    );

    const items = contentRows.map((c) => {
      const source = c.sources as Record<string, unknown>;
      const analysis = analysisMap.get(c.id);

      return {
        id: c.id,
        source_id: c.source_id,
        platform: c.platform,
        external_id: c.external_id || '',
        title: c.title,
        url: c.url || '',
        published_at: c.published_at,
        raw_text: c.raw_text || '',
        created_at: c.created_at,
        source: {
          id: source.id as string,
          name: source.name as string,
          slug: source.slug as string,
          bio: (source.bio || '') as string,
          avatar_url: (source.avatar_url || '') as string,
          domains: source.domains as string[],
          scores: source.scores as Source['scores'],
          weighted_score: source.weighted_score as number,
          created_at: source.created_at as string,
          updated_at: source.updated_at as string,
        },
        analysis: analysis
          ? {
              id: analysis.id,
              content_id: analysis.content_id,
              display_title: analysis.display_title || undefined,
              sentiment_overall: analysis.sentiment_overall,
              sentiment_score: analysis.sentiment_score,
              assets_mentioned: analysis.assets_mentioned as string[],
              themes: analysis.themes as string[],
              predictions: analysis.predictions as string[],
              key_quotes: analysis.key_quotes as string[],
              referenced_people: analysis.referenced_people as string[],
              summary: analysis.summary || '',
              created_at: analysis.created_at,
            }
          : {
              id: '',
              content_id: c.id,
              sentiment_overall: 'neutral' as const,
              sentiment_score: 0,
              assets_mentioned: [],
              themes: [],
              predictions: [],
              key_quotes: [],
              referenced_people: [],
              summary: c.raw_text?.slice(0, 200) || '',
              created_at: c.created_at,
            },
      };
    });

    return { items, hasMore };
  } catch {
    const from = (page - 1) * limit;
    const sliced = mockContentWithAnalysis.slice(from, from + limit + 1);
    const mockHasMore = sliced.length > limit;
    if (mockHasMore) sliced.pop();
    return { items: sliced, hasMore: mockHasMore };
  }
}

export async function getSourceBySlug(slug: string): Promise<Source | null> {
  if (!hasSupabase) {
    return mockSources.find((s) => s.id === slug || s.slug === slug) || null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .limit(1)
      .single();

    if (error || !data) {
      return mockSources.find((s) => s.id === slug || s.slug === slug) || null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      bio: data.bio || '',
      avatar_url: data.avatar_url || '',
      domains: data.domains as string[],
      scores: data.scores as Source['scores'],
      weighted_score: data.weighted_score,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return mockSources.find((s) => s.id === slug || s.slug === slug) || null;
  }
}

export async function getContentForSource(sourceId: string): Promise<ContentWithAnalysis[]> {
  if (!hasSupabase) {
    return mockContentWithAnalysis.filter((c) => c.source_id === sourceId);
  }

  try {
    const supabase = getSupabaseClient();
    const { data: contentRows, error } = await supabase
      .from('content')
      .select('*, sources(*)')
      .eq('source_id', sourceId)
      .order('published_at', { ascending: false });

    if (error || !contentRows || contentRows.length === 0) {
      return mockContentWithAnalysis.filter((c) => c.source_id === sourceId);
    }

    const contentIds = contentRows.map((c) => c.id);
    const { data: analyses } = await supabase
      .from('analyses')
      .select('*')
      .in('content_id', contentIds);

    const analysisMap = new Map(
      (analyses || []).map((a) => [a.content_id, a])
    );

    return contentRows.map((c) => {
      const source = c.sources as Record<string, unknown>;
      const analysis = analysisMap.get(c.id);

      return {
        id: c.id,
        source_id: c.source_id,
        platform: c.platform,
        external_id: c.external_id || '',
        title: c.title,
        url: c.url || '',
        published_at: c.published_at,
        raw_text: c.raw_text || '',
        created_at: c.created_at,
        source: {
          id: source.id as string,
          name: source.name as string,
          slug: source.slug as string,
          bio: (source.bio || '') as string,
          avatar_url: (source.avatar_url || '') as string,
          domains: source.domains as string[],
          scores: source.scores as Source['scores'],
          weighted_score: source.weighted_score as number,
          created_at: source.created_at as string,
          updated_at: source.updated_at as string,
        },
        analysis: analysis
          ? {
              id: analysis.id,
              content_id: analysis.content_id,
              display_title: analysis.display_title || undefined,
              sentiment_overall: analysis.sentiment_overall,
              sentiment_score: analysis.sentiment_score,
              assets_mentioned: analysis.assets_mentioned as string[],
              themes: analysis.themes as string[],
              predictions: analysis.predictions as string[],
              key_quotes: analysis.key_quotes as string[],
              referenced_people: analysis.referenced_people as string[],
              summary: analysis.summary || '',
              created_at: analysis.created_at,
            }
          : {
              id: '',
              content_id: c.id,
              sentiment_overall: 'neutral' as const,
              sentiment_score: 0,
              assets_mentioned: [],
              themes: [],
              predictions: [],
              key_quotes: [],
              referenced_people: [],
              summary: c.raw_text?.slice(0, 200) || '',
              created_at: c.created_at,
            },
      };
    });
  } catch {
    return mockContentWithAnalysis.filter((c) => c.source_id === sourceId);
  }
}

export async function getPredictionsForSource(sourceId: string): Promise<Prediction[]> {
  if (!hasSupabase) {
    return mockPredictions.filter((p) => p.source_id === sourceId);
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return mockPredictions.filter((p) => p.source_id === sourceId);
    }

    return data.map((p) => ({
      id: p.id,
      content_id: p.content_id,
      source_id: p.source_id,
      claim: p.claim,
      asset_or_theme: p.asset_or_theme || '',
      direction: p.direction || '',
      time_horizon: p.time_horizon || '',
      confidence: p.confidence || '',
      status: p.status,
      resolved_at: p.resolved_at,
      notes: p.notes || '',
      created_at: p.created_at,
    }));
  } catch {
    return mockPredictions.filter((p) => p.source_id === sourceId);
  }
}

export async function getPredictions(): Promise<Prediction[]> {
  if (!hasSupabase) return mockPredictions;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return mockPredictions;

    return data.map((p) => ({
      id: p.id,
      content_id: p.content_id,
      source_id: p.source_id,
      claim: p.claim,
      asset_or_theme: p.asset_or_theme || '',
      direction: p.direction || '',
      time_horizon: p.time_horizon || '',
      confidence: p.confidence || '',
      status: p.status,
      resolved_at: p.resolved_at,
      notes: p.notes || '',
      created_at: p.created_at,
    }));
  } catch {
    return mockPredictions;
  }
}

function countThemes(rows: { themes: unknown }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const themes = (row.themes || []) as string[];
    for (const theme of themes) {
      counts.set(theme, (counts.get(theme) || 0) + 1);
    }
  }
  return counts;
}

export async function getTrendingTopics(): Promise<TrendingTopic[]> {
  if (!hasSupabase) return mockTrendingTopics;

  try {
    const supabase = getSupabaseClient();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [currentResult, previousResult] = await Promise.all([
      supabase.from('analyses').select('themes').gte('created_at', thirtyDaysAgo),
      supabase.from('analyses').select('themes').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    ]);

    const currentRows = currentResult.data || [];
    const previousRows = previousResult.data || [];

    if (currentRows.length === 0) return mockTrendingTopics;

    const currentCounts = countThemes(currentRows);
    const previousCounts = countThemes(previousRows);

    const topics: TrendingTopic[] = [];
    const sorted = Array.from(currentCounts.entries()).sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < Math.min(sorted.length, 10); i++) {
      const [theme, count] = sorted[i];
      const prev = previousCounts.get(theme) || 0;

      let trend: 'up' | 'down' | 'stable';
      if (prev === 0) {
        trend = 'up';
      } else if (count > prev * 1.2) {
        trend = 'up';
      } else if (count < prev * 0.8) {
        trend = 'down';
      } else {
        trend = 'stable';
      }

      topics.push({ rank: i + 1, title: theme, mentions: count, trend });
    }

    return topics;
  } catch {
    return mockTrendingTopics;
  }
}

const horizonOrder: Record<string, number> = { short: 0, medium: 1, long: 2 };

export async function getOutlook(): Promise<Outlook[]> {
  if (!hasSupabase) return mockOutlook;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('outlook')
      .select('*');

    if (error || !data || data.length === 0) return mockOutlook;

    return data
      .sort((a, b) => (horizonOrder[a.time_horizon] ?? 9) - (horizonOrder[b.time_horizon] ?? 9))
      .map((o) => ({
        id: o.id,
        time_horizon: o.time_horizon,
        domain: o.domain || 'general',
        title: o.title,
        subtitle: o.subtitle || '',
        thesis_intro: o.thesis_intro || '',
        thesis_points: (o.thesis_points || []) as Outlook['thesis_points'],
        positioning: (o.positioning || []) as string[],
        key_themes: (o.key_themes || []) as string[],
        sentiment: o.sentiment,
        confidence: o.confidence,
        supporting_sources: (o.supporting_sources || []) as { name: string; weight: number }[],
        last_updated: o.last_updated,
        created_at: o.created_at,
      }));
  } catch {
    return mockOutlook;
  }
}

export async function getOutlookHistory(limit: number = 10): Promise<OutlookHistory[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('outlook_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((h) => ({
      id: h.id,
      outlook_id: h.outlook_id,
      time_horizon: h.time_horizon,
      evaluation_reasoning: h.evaluation_reasoning,
      changes_summary: (h.changes_summary || []) as string[],
      previous_sentiment: h.previous_sentiment,
      new_sentiment: h.new_sentiment,
      previous_confidence: h.previous_confidence,
      new_confidence: h.new_confidence,
      analyses_evaluated: h.analyses_evaluated,
      created_at: h.created_at,
    }));
  } catch {
    return [];
  }
}
