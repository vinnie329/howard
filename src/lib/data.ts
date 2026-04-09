import { getSupabaseClient } from './supabase';
import type { Source, Analysis, ContentWithAnalysis, Prediction, Outlook, OutlookHistory, TrendingTopic, SourcePerformance, BacktestRun, HousePrediction, HouseCalibration, HouseTrackRecord, PortfolioSnapshot, PortfolioPosition, PortfolioPerformance } from '@/types';
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
      domains: (Array.isArray(s.domains) ? s.domains : []) as string[],
      scores: (s.scores || {}) as Source['scores'],
      weighted_score: s.weighted_score ?? 0,
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

    // Fetch content with joined source, excluding items with null source_id
    const { data: contentRows, error: contentError } = await supabase
      .from('content')
      .select('*, sources(*)')
      .not('source_id', 'is', null)
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
        guest: c.guest || null,
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const filter = isUuid ? `slug.eq.${slug},id.eq.${slug}` : `slug.eq.${slug}`;
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .or(filter)
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
        guest: c.guest || null,
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
      themes: (p.themes || []) as string[],
      assets_mentioned: (p.assets_mentioned || []) as string[],
      sentiment: p.sentiment || p.direction || 'neutral',
      time_horizon: p.time_horizon || '',
      confidence: p.confidence || '',
      specificity: p.specificity || 'thematic',
      date_made: p.date_made || p.created_at,
      notes: p.notes || '',
      outcome: p.outcome || 'pending',
      outcome_reasoning: p.outcome_reasoning || null,
      outcome_score: p.outcome_score ?? null,
      evaluated_at: p.evaluated_at || null,
      market_context: (p.market_context || {}) as Record<string, unknown>,
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
      themes: (p.themes || []) as string[],
      assets_mentioned: (p.assets_mentioned || []) as string[],
      sentiment: p.sentiment || p.direction || 'neutral',
      time_horizon: p.time_horizon || '',
      confidence: p.confidence || '',
      specificity: p.specificity || 'thematic',
      date_made: p.date_made || p.created_at,
      notes: p.notes || '',
      outcome: p.outcome || 'pending',
      outcome_reasoning: p.outcome_reasoning || null,
      outcome_score: p.outcome_score ?? null,
      evaluated_at: p.evaluated_at || null,
      market_context: (p.market_context || {}) as Record<string, unknown>,
      created_at: p.created_at,
    }));
  } catch {
    return mockPredictions;
  }
}

export interface ContentDetail {
  id: string;
  source: Source;
  title: string;
  url: string;
  platform: string;
  published_at: string;
  guest: string | null;
  analysis: Analysis;
  predictions: Prediction[];
}

export async function getContentById(contentId: string): Promise<ContentDetail | null> {
  if (!hasSupabase) {
    const item = mockContentWithAnalysis.find((c) => c.id === contentId);
    if (!item) return null;
    const source = mockSources.find((s) => s.id === item.source_id);
    if (!source) return null;
    const preds = mockPredictions.filter((p) => p.content_id === contentId);
    return {
      id: item.id,
      source,
      title: item.title,
      url: item.url,
      platform: item.platform,
      published_at: item.published_at,
      guest: null,
      analysis: item.analysis,
      predictions: preds,
    };
  }

  try {
    const supabase = getSupabaseClient();

    const { data: content, error: contentErr } = await supabase
      .from('content')
      .select('*')
      .eq('id', contentId)
      .single();

    if (contentErr || !content || !content.source_id) return null;

    const [sourceRes, analysisRes, predsRes] = await Promise.all([
      supabase.from('sources').select('*').eq('id', content.source_id).single(),
      supabase.from('analyses').select('*').eq('content_id', contentId).single(),
      supabase.from('predictions').select('*').eq('content_id', contentId).order('created_at', { ascending: false }),
    ]);

    if (sourceRes.error || !sourceRes.data) return null;

    const source: Source = {
      id: sourceRes.data.id,
      name: sourceRes.data.name,
      slug: sourceRes.data.slug,
      bio: sourceRes.data.bio || '',
      avatar_url: sourceRes.data.avatar_url || '',
      domains: sourceRes.data.domains || [],
      scores: sourceRes.data.scores || {},
      weighted_score: sourceRes.data.weighted_score || 0,
      created_at: sourceRes.data.created_at,
      updated_at: sourceRes.data.updated_at,
    };

    const a = analysisRes.data;
    const analysis: Analysis = a ? {
      id: a.id,
      content_id: a.content_id,
      display_title: a.display_title || '',
      sentiment_overall: a.sentiment_overall,
      sentiment_score: a.sentiment_score,
      assets_mentioned: (a.assets_mentioned || []) as string[],
      themes: (a.themes || []) as string[],
      predictions: (a.predictions || []) as string[],
      key_quotes: (a.key_quotes || []) as string[],
      referenced_people: (a.referenced_people || []) as string[],
      summary: a.summary || '',
      created_at: a.created_at,
    } : {
      id: '', content_id: contentId, sentiment_overall: 'neutral',
      sentiment_score: 0, assets_mentioned: [], themes: [],
      predictions: [], key_quotes: [], referenced_people: [],
      summary: '', created_at: content.created_at,
    };

    const predictions: Prediction[] = (predsRes.data || []).map((p) => ({
      id: p.id,
      content_id: p.content_id,
      source_id: p.source_id,
      claim: p.claim,
      themes: (p.themes || []) as string[],
      assets_mentioned: (p.assets_mentioned || []) as string[],
      sentiment: p.sentiment || p.direction || 'neutral',
      time_horizon: p.time_horizon || '',
      confidence: p.confidence || '',
      specificity: p.specificity || 'thematic',
      date_made: p.date_made || p.created_at,
      notes: p.notes || '',
      outcome: p.outcome || 'pending',
      outcome_reasoning: p.outcome_reasoning || null,
      outcome_score: p.outcome_score ?? null,
      evaluated_at: p.evaluated_at || null,
      market_context: (p.market_context || {}) as Record<string, unknown>,
      created_at: p.created_at,
    }));

    return {
      id: content.id,
      source,
      title: content.title,
      url: content.url || '',
      platform: content.platform,
      published_at: content.published_at,
      guest: content.guest || null,
      analysis,
      predictions,
    };
  } catch {
    return null;
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

export async function getOutlookHistoryById(id: string): Promise<OutlookHistory | null> {
  if (!hasSupabase) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('outlook_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      outlook_id: data.outlook_id,
      time_horizon: data.time_horizon,
      evaluation_reasoning: data.evaluation_reasoning,
      changes_summary: (data.changes_summary || []) as string[],
      previous_sentiment: data.previous_sentiment,
      new_sentiment: data.new_sentiment,
      previous_confidence: data.previous_confidence,
      new_confidence: data.new_confidence,
      analyses_evaluated: data.analyses_evaluated,
      created_at: data.created_at,
    };
  } catch {
    return null;
  }
}

// --- 13F Holdings ---

export interface Fund {
  id: string;
  name: string;
  slug: string;
  cik: string;
  manager_name: string | null;
}

export interface Holding {
  id: string;
  fund_id: string;
  filing_date: string;
  cusip: string;
  ticker: string | null;
  company_name: string;
  title_of_class: string | null;
  value: number;
  shares: number;
  share_change: number;
  change_type: string;
  option_type: string | null;
  investment_discretion: string;
}

export async function getFunds(): Promise<Fund[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .order('name');

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getHoldings(fundId?: string, filingDate?: string): Promise<Holding[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('holdings')
      .select('*')
      .order('value', { ascending: false });

    if (fundId) query = query.eq('fund_id', fundId);
    if (filingDate) query = query.eq('filing_date', filingDate);

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getFilingDates(fundId?: string): Promise<string[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('holdings')
      .select('filing_date');

    if (fundId) query = query.eq('fund_id', fundId);

    const { data, error } = await query;
    if (error || !data) return [];

    const unique = Array.from(new Set(data.map((d: { filing_date: string }) => d.filing_date)));
    return unique.sort().reverse();
  } catch {
    return [];
  }
}

// --- Semantic search / related content ---

export interface SearchResult {
  id: string;
  type: 'content' | 'analysis' | 'prediction' | 'source';
  title: string;
  summary: string | null;
  source_id: string | null;
  content_id: string | null;
  similarity: number;
}

/**
 * Find content semantically related to a given content item.
 * Uses the content's existing embedding to search across all tables.
 */
export async function getRelatedContent(
  contentId: string,
  limit: number = 5,
  threshold: number = 0.5,
): Promise<SearchResult[]> {
  if (!hasSupabase || !process.env.VOYAGE_API_KEY) return [];

  try {
    const { getSupabaseServiceClient } = await import('./supabase');
    const supabase = getSupabaseServiceClient();

    // Get the content's embedding
    const { data: content, error: contentErr } = await supabase
      .from('content')
      .select('embedding, title, raw_text')
      .eq('id', contentId)
      .single();

    if (contentErr || !content) return [];

    let embeddingStr: string;

    if (content.embedding) {
      embeddingStr = content.embedding;
    } else {
      // Generate embedding on-the-fly if missing
      const { generateEmbedding, toVectorString } = await import('./embeddings');
      const emb = await generateEmbedding(`${content.title}\n\n${content.raw_text || ''}`);
      embeddingStr = toVectorString(emb);
    }

    const { data, error } = await supabase.rpc('search_all', {
      query_embedding: embeddingStr,
      match_threshold: threshold,
      match_count: limit + 1, // +1 to account for self-match
    });

    if (error || !data) return [];

    // Filter out self-match (content with same id, or analysis/prediction belonging to this content)
    return (data as SearchResult[])
      .filter((r) => r.id !== contentId && r.content_id !== contentId)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Find predictions semantically similar to a given prediction.
 */
export async function getRelatedPredictions(
  predictionId: string,
  limit: number = 5,
  threshold: number = 0.5,
): Promise<SearchResult[]> {
  if (!hasSupabase || !process.env.VOYAGE_API_KEY) return [];

  try {
    const { getSupabaseServiceClient } = await import('./supabase');
    const supabase = getSupabaseServiceClient();

    const { data: prediction, error: predErr } = await supabase
      .from('predictions')
      .select('embedding, claim, themes, assets_mentioned, sentiment')
      .eq('id', predictionId)
      .single();

    if (predErr || !prediction) return [];

    let embeddingStr: string;

    if (prediction.embedding) {
      embeddingStr = prediction.embedding;
    } else {
      const { generateEmbedding: genEmb, preparePredictionText, toVectorString } = await import('./embeddings');
      const text = preparePredictionText(
        prediction.claim,
        (prediction.themes || []) as string[],
        (prediction.assets_mentioned || []) as string[],
        prediction.sentiment || '',
      );
      const emb = await genEmb(text);
      embeddingStr = toVectorString(emb);
    }

    const { data, error } = await supabase.rpc('match_predictions', {
      query_embedding: embeddingStr,
      match_threshold: threshold,
      match_count: limit + 1,
    });

    if (error || !data) return [];

    // Filter out self-match and map to SearchResult shape
    return (data as Array<{ id: string; claim: string; source_id: string; content_id: string; similarity: number }>)
      .filter((r) => r.id !== predictionId)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        type: 'prediction' as const,
        title: r.claim,
        summary: null,
        source_id: r.source_id,
        content_id: r.content_id,
        similarity: r.similarity,
      }));
  } catch {
    return [];
  }
}

// --- Positioning ---

export interface PositioningData {
  narrative: string;
  opportunities: Array<{ ticker: string; name: string; rationale: string }>;
  shorts: Array<{ ticker: string; name: string; rationale: string; confidence: number }>;
  fat_pitches: Array<{ ticker: string; name: string; dev200d: number }>;
  avoids: string[];
  posture: 'aggressive' | 'lean-in' | 'neutral' | 'cautious' | 'defensive';
  generated_at: string;
}

export async function getPositioning(refresh = false): Promise<PositioningData | null> {
  try {
    const url = refresh ? '/api/positioning?refresh=true' : '/api/positioning';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.narrative) return null;
    return data as PositioningData;
  } catch {
    return null;
  }
}

export interface PositioningChange {
  date: string;
  posture_change: { from: string; to: string } | null;
  added_opportunities: string[];
  removed_opportunities: string[];
  added_shorts: string[];
  removed_shorts: string[];
  added_avoids: string[];
  removed_avoids: string[];
  drivers: string[]; // house view changes that drove this positioning shift
}

export async function getPositioningHistory(limit = 10): Promise<PositioningChange[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('positioning_cache')
      .select('key, data, generated_at')
      .order('key', { ascending: false })
      .limit(limit + 1); // +1 to compute diffs

    if (error || !data || data.length < 2) return [];

    const changes: PositioningChange[] = [];
    for (let i = 0; i < data.length - 1; i++) {
      const curr = data[i].data as PositioningData;
      const prev = data[i + 1].data as PositioningData;
      if (!curr || !prev) continue;

      const currOpps = new Set((curr.opportunities || []).map((o) => o.ticker));
      const prevOpps = new Set((prev.opportunities || []).map((o) => o.ticker));
      const currShorts = new Set((curr.shorts || []).map((s) => s.ticker));
      const prevShorts = new Set((prev.shorts || []).map((s) => s.ticker));
      const currAvoids = new Set(curr.avoids || []);
      const prevAvoids = new Set(prev.avoids || []);

      const added_opportunities = Array.from(currOpps).filter((t) => !prevOpps.has(t));
      const removed_opportunities = Array.from(prevOpps).filter((t) => !currOpps.has(t));
      const added_shorts = Array.from(currShorts).filter((t) => !prevShorts.has(t));
      const removed_shorts = Array.from(prevShorts).filter((t) => !currShorts.has(t));
      const added_avoids = Array.from(currAvoids).filter((a) => !prevAvoids.has(a));
      const removed_avoids = Array.from(prevAvoids).filter((a) => !currAvoids.has(a));

      const posture_change = curr.posture !== prev.posture
        ? { from: prev.posture, to: curr.posture }
        : null;

      const hasChanges = posture_change ||
        added_opportunities.length > 0 || removed_opportunities.length > 0 ||
        added_shorts.length > 0 || removed_shorts.length > 0 ||
        added_avoids.length > 0 || removed_avoids.length > 0;

      if (hasChanges) {
        // Find house view changes that drove this positioning shift
        const prevDate = data[i + 1].key;
        const currDate = data[i].key;
        const drivers: string[] = [];

        // New house predictions between these dates
        const { data: newPreds } = await supabase
          .from('house_predictions')
          .select('claim, asset, direction, confidence')
          .gte('created_at', prevDate + 'T00:00:00')
          .lt('created_at', currDate + 'T23:59:59')
          .order('confidence', { ascending: false })
          .limit(5);

        for (const p of newPreds || []) {
          const arrow = p.direction === 'long' ? '↑' : p.direction === 'short' ? '↓' : '↔';
          drivers.push(`New: ${arrow} ${p.asset} ${p.confidence}% — ${p.claim.length > 60 ? p.claim.slice(0, 60) + '…' : p.claim}`);
        }

        // Resolved house predictions between these dates
        const { data: resolvedPreds } = await supabase
          .from('house_predictions')
          .select('claim, asset, outcome')
          .gte('evaluated_at', prevDate + 'T00:00:00')
          .lt('evaluated_at', currDate + 'T23:59:59')
          .neq('outcome', 'pending')
          .limit(5);

        for (const p of resolvedPreds || []) {
          const icon = p.outcome === 'correct' ? '✓' : p.outcome === 'incorrect' ? '✗' : '—';
          drivers.push(`Resolved ${icon}: ${p.asset} — ${p.claim.length > 50 ? p.claim.slice(0, 50) + '…' : p.claim}`);
        }

        changes.push({
          date: data[i].key,
          posture_change,
          added_opportunities,
          removed_opportunities,
          added_shorts,
          removed_shorts,
          added_avoids,
          removed_avoids,
          drivers,
        });
      }
    }

    return changes;
  } catch {
    return [];
  }
}

// --- Performance Tracking ---

export async function getSourcePerformance(): Promise<SourcePerformance[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('source_performance')
      .select('*')
      .order('accuracy_rate', { ascending: false });

    if (error || !data) return [];

    return data.map((sp) => ({
      id: sp.id,
      source_id: sp.source_id,
      total_predictions: sp.total_predictions,
      evaluated_predictions: sp.evaluated_predictions,
      correct: sp.correct,
      incorrect: sp.incorrect,
      partially_correct: sp.partially_correct,
      expired: sp.expired,
      accuracy_rate: sp.accuracy_rate,
      weighted_accuracy: sp.weighted_accuracy,
      avg_confidence_when_correct: sp.avg_confidence_when_correct,
      avg_confidence_when_incorrect: sp.avg_confidence_when_incorrect,
      best_domain: sp.best_domain,
      worst_domain: sp.worst_domain,
      performance_by_horizon: (sp.performance_by_horizon || {}) as SourcePerformance['performance_by_horizon'],
      performance_by_specificity: (sp.performance_by_specificity || {}) as SourcePerformance['performance_by_specificity'],
      streak_current: sp.streak_current,
      streak_best: sp.streak_best,
      last_evaluated_at: sp.last_evaluated_at,
      updated_at: sp.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getSourcePerformanceById(sourceId: string): Promise<SourcePerformance | null> {
  if (!hasSupabase) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('source_performance')
      .select('*')
      .eq('source_id', sourceId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      source_id: data.source_id,
      total_predictions: data.total_predictions,
      evaluated_predictions: data.evaluated_predictions,
      correct: data.correct,
      incorrect: data.incorrect,
      partially_correct: data.partially_correct,
      expired: data.expired,
      accuracy_rate: data.accuracy_rate,
      weighted_accuracy: data.weighted_accuracy,
      avg_confidence_when_correct: data.avg_confidence_when_correct,
      avg_confidence_when_incorrect: data.avg_confidence_when_incorrect,
      best_domain: data.best_domain,
      worst_domain: data.worst_domain,
      performance_by_horizon: (data.performance_by_horizon || {}) as SourcePerformance['performance_by_horizon'],
      performance_by_specificity: (data.performance_by_specificity || {}) as SourcePerformance['performance_by_specificity'],
      streak_current: data.streak_current,
      streak_best: data.streak_best,
      last_evaluated_at: data.last_evaluated_at,
      updated_at: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function getBacktestRuns(limit: number = 10): Promise<BacktestRun[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('backtest_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

// --- House Predictions ---

export async function getHousePredictions(filter?: 'active' | 'evaluated' | 'all'): Promise<HousePrediction[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('house_predictions')
      .select('*')
      .is('superseded_by', null) // only latest versions
      .order('confidence', { ascending: false }); // high confidence first

    if (filter === 'active') {
      query = query.eq('outcome', 'pending');
    } else if (filter === 'evaluated') {
      query = query.neq('outcome', 'pending');
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as HousePrediction[];
  } catch {
    return [];
  }
}

export async function getHousePredictionTimeline(): Promise<HousePrediction[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('house_predictions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as HousePrediction[];
  } catch {
    return [];
  }
}

export async function getHousePredictionsForAsset(asset: string): Promise<HousePrediction[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('house_predictions')
      .select('*')
      .eq('asset', asset)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as HousePrediction[];
  } catch {
    return [];
  }
}

export interface HouseViewChange {
  date: string;
  added: Array<{ asset: string; direction: string; claim: string; confidence: number; conviction: string }>;
  updated: Array<{ asset: string; direction: string; claim: string; confidence: number; prev_confidence: number; conviction: string; prev_claim: string }>;
  removed: Array<{ asset: string; direction: string; claim: string; confidence: number; outcome: string }>;
}

export async function getHouseViewHistory(limit = 10): Promise<HouseViewChange[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();

    // Fetch all predictions including superseded ones, ordered by creation
    const { data, error } = await supabase
      .from('house_predictions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const preds = data as HousePrediction[];
    const byId = new Map(preds.map(p => [p.id, p]));

    // Group predictions by creation timestamp (within 10 min = same run)
    const runs: Map<string, HousePrediction[]> = new Map();
    for (const p of preds) {
      const t = new Date(p.created_at);
      const bucket = new Date(Math.floor(t.getTime() / 600000) * 600000).toISOString();
      const group = runs.get(bucket) || [];
      group.push(p);
      runs.set(bucket, group);
    }

    // For each run, classify changes
    const changes: HouseViewChange[] = [];

    // Sort runs by date descending
    const sortedRuns = Array.from(runs.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    for (const [bucket, group] of sortedRuns) {
      const added: HouseViewChange['added'] = [];
      const updated: HouseViewChange['updated'] = [];
      const removed: HouseViewChange['removed'] = [];

      for (const p of group) {
        if (p.supersedes) {
          // This prediction replaced an earlier one — it's an update
          const prev = byId.get(p.supersedes);
          updated.push({
            asset: p.asset,
            direction: p.direction,
            claim: p.claim,
            confidence: p.confidence,
            prev_confidence: prev?.confidence ?? p.confidence,
            conviction: p.conviction,
            prev_claim: prev?.claim ?? '',
          });
        } else if (p.outcome === 'expired' && !p.superseded_by) {
          // Expired without replacement — it was removed
          removed.push({
            asset: p.asset,
            direction: p.direction,
            claim: p.claim,
            confidence: p.confidence,
            outcome: p.outcome,
          });
        } else if (!p.supersedes && p.version === 1) {
          // New prediction (version 1, not replacing anything)
          added.push({
            asset: p.asset,
            direction: p.direction,
            claim: p.claim,
            confidence: p.confidence,
            conviction: p.conviction,
          });
        }
      }

      // Only include runs that had actual changes
      if (added.length > 0 || updated.length > 0 || removed.length > 0) {
        changes.push({ date: bucket, added, updated, removed });
      }
    }

    return changes.slice(0, limit);
  } catch {
    return [];
  }
}

export interface HouseViewChangeDetail {
  date: string;
  added: Array<HousePrediction>;
  updated: Array<{ current: HousePrediction; previous: HousePrediction }>;
  removed: Array<HousePrediction>;
  kept: Array<HousePrediction>;
}

export async function getHouseViewChangeDetail(date: string): Promise<HouseViewChangeDetail | null> {
  if (!hasSupabase) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('house_predictions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    const preds = data as HousePrediction[];
    const byId = new Map(preds.map(p => [p.id, p]));

    // Find predictions in this timestamp bucket (10-min window)
    const bucketTime = new Date(date).getTime();
    const group = preds.filter(p => {
      const t = new Date(p.created_at).getTime();
      return Math.abs(Math.floor(t / 600000) * 600000 - bucketTime) < 600000;
    });

    if (group.length === 0) return null;

    const added: HousePrediction[] = [];
    const updated: Array<{ current: HousePrediction; previous: HousePrediction }> = [];
    const removed: HousePrediction[] = [];

    for (const p of group) {
      if (p.supersedes) {
        const prev = byId.get(p.supersedes);
        if (prev) {
          updated.push({ current: p, previous: prev });
        } else {
          added.push(p);
        }
      } else if (p.outcome === 'expired' && !p.superseded_by) {
        removed.push(p);
      } else if (!p.supersedes && p.version === 1) {
        added.push(p);
      }
    }

    // Find predictions that were active at this time but NOT changed
    const changedAssets = new Set([
      ...added.map(p => `${p.asset}:${p.direction}`),
      ...updated.map(u => `${u.current.asset}:${u.current.direction}`),
      ...removed.map(p => `${p.asset}:${p.direction}`),
    ]);
    const kept = preds.filter(p => {
      const createdBefore = new Date(p.created_at).getTime() < bucketTime;
      const notSupersededYet = !p.superseded_by || new Date(p.updated_at || p.created_at).getTime() > bucketTime;
      return createdBefore && notSupersededYet && p.outcome === 'pending' && !changedAssets.has(`${p.asset}:${p.direction}`);
    });

    return { date, added, updated, removed, kept };
  } catch {
    return null;
  }
}

export interface PortfolioRebalanceDetail {
  date: string;
  reasoning: string;
  risk_posture: string;
  prev_risk_posture: string;
  added: Array<PortfolioPosition>;
  removed: Array<PortfolioPosition & { pnl_pct: number | null }>;
  resized: Array<{ current: PortfolioPosition; previous: PortfolioPosition }>;
  unchanged: Array<PortfolioPosition>;
  drivers: string[];
}

export async function getPortfolioRebalanceDetail(date: string): Promise<PortfolioRebalanceDetail | null> {
  if (!hasSupabase) return null;

  try {
    const supabase = getSupabaseClient();

    // Find the snapshot for this date
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('id, generated_at, rebalance_reasoning, risk_posture, supersedes')
      .gte('generated_at', date + 'T00:00:00')
      .lt('generated_at', date + 'T23:59:59')
      .order('generated_at', { ascending: false })
      .limit(1);

    if (error || !snapshots || snapshots.length === 0) return null;

    const curr = snapshots[0];

    // Find the previous snapshot
    const { data: prevSnapshots } = await supabase
      .from('portfolio_snapshots')
      .select('id, generated_at, risk_posture')
      .lt('generated_at', curr.generated_at)
      .order('generated_at', { ascending: false })
      .limit(1);

    const prev = prevSnapshots?.[0];
    if (!prev) return null;

    // Fetch positions for both
    const [{ data: currPos }, { data: prevPos }] = await Promise.all([
      supabase.from('portfolio_positions').select('*').eq('snapshot_id', curr.id),
      supabase.from('portfolio_positions').select('*').eq('snapshot_id', prev.id),
    ]);

    if (!currPos || !prevPos) return null;

    const currMap = new Map((currPos as PortfolioPosition[]).map(p => [`${p.ticker}:${p.direction}`, p]));
    const prevMap = new Map((prevPos as PortfolioPosition[]).map(p => [`${p.ticker}:${p.direction}`, p]));

    const added: PortfolioPosition[] = [];
    const removed: Array<PortfolioPosition & { pnl_pct: number | null }> = [];
    const resized: Array<{ current: PortfolioPosition; previous: PortfolioPosition }> = [];
    const unchanged: PortfolioPosition[] = [];

    Array.from(currMap.entries()).forEach(([key, pos]) => {
      const prevP = prevMap.get(key);
      if (!prevP) {
        added.push(pos);
      } else if (Math.abs(pos.allocation_pct - prevP.allocation_pct) >= 1) {
        resized.push({ current: pos, previous: prevP });
      } else {
        unchanged.push(pos);
      }
    });

    Array.from(prevMap.entries()).forEach(([key, pos]) => {
      if (!currMap.has(key)) {
        let pnl_pct: number | null = null;
        if (pos.entry_price && pos.current_price) {
          const raw = (pos.current_price - pos.entry_price) / pos.entry_price;
          pnl_pct = (pos.direction === 'long' ? raw : -raw) * 100;
        }
        removed.push({ ...pos, pnl_pct });
      }
    });

    // Drivers
    const drivers: string[] = [];
    const { data: newPreds } = await supabase
      .from('house_predictions')
      .select('claim, asset, direction, confidence')
      .gte('created_at', prev.generated_at)
      .lt('created_at', curr.generated_at)
      .order('confidence', { ascending: false })
      .limit(5);

    for (const p of newPreds || []) {
      const arrow = p.direction === 'long' ? '\u2191' : '\u2193';
      drivers.push(`${arrow} ${p.asset} ${p.confidence}% — ${p.claim.length > 80 ? p.claim.slice(0, 80) + '...' : p.claim}`);
    }

    return {
      date,
      reasoning: curr.rebalance_reasoning || '',
      risk_posture: curr.risk_posture || '',
      prev_risk_posture: prev.risk_posture || '',
      added,
      removed,
      resized,
      unchanged,
      drivers,
    };
  } catch {
    return null;
  }
}

export async function getHouseCalibration(): Promise<HouseCalibration[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('house_calibration')
      .select('*')
      .eq('category', 'all')
      .order('confidence_bucket', { ascending: true });

    if (error || !data) return [];
    return data as HouseCalibration[];
  } catch {
    return [];
  }
}

export async function getHouseTrackRecord(): Promise<HouseTrackRecord | null> {
  if (!hasSupabase) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('house_track_record')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as HouseTrackRecord;
  } catch {
    return null;
  }
}

// ── Model Portfolio ──

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot | null> {
  if (!hasSupabase) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('is_current', true)
      .single();
    if (error || !data) return null;
    return data as PortfolioSnapshot;
  } catch {
    return null;
  }
}

export async function getPortfolioPositions(snapshotId: string): Promise<PortfolioPosition[]> {
  if (!hasSupabase) return [];
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('allocation_pct', { ascending: false });
    if (error || !data) return [];
    return data as PortfolioPosition[];
  } catch {
    return [];
  }
}

export interface PortfolioRebalance {
  date: string;
  reasoning: string;
  risk_posture: string;
  added: Array<{ ticker: string; direction: string; allocation: number }>;
  removed: Array<{ ticker: string; direction: string; pnl_pct: number | null }>;
  resized: Array<{ ticker: string; direction: string; from: number; to: number }>;
  drivers: string[];
}

export async function getPortfolioRebalanceHistory(): Promise<PortfolioRebalance[]> {
  if (!hasSupabase) return [];

  try {
    const supabase = getSupabaseClient();

    // Get all snapshots with their positions
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('id, generated_at, rebalance_reasoning, risk_posture, supersedes')
      .order('generated_at', { ascending: false })
      .limit(10);

    if (error || !snapshots || snapshots.length < 2) return [];

    const rebalances: PortfolioRebalance[] = [];

    for (let i = 0; i < snapshots.length - 1; i++) {
      const curr = snapshots[i];
      const prev = snapshots[i + 1];

      // Fetch positions for both snapshots
      const [{ data: currPos }, { data: prevPos }] = await Promise.all([
        supabase.from('portfolio_positions')
          .select('ticker, direction, allocation_pct, entry_price, current_price')
          .eq('snapshot_id', curr.id),
        supabase.from('portfolio_positions')
          .select('ticker, direction, allocation_pct, entry_price, current_price')
          .eq('snapshot_id', prev.id),
      ]);

      if (!currPos || !prevPos) continue;

      const currMap = new Map(currPos.map((p) => [`${p.ticker}:${p.direction}`, p]));
      const prevMap = new Map(prevPos.map((p) => [`${p.ticker}:${p.direction}`, p]));

      const added: PortfolioRebalance['added'] = [];
      const removed: PortfolioRebalance['removed'] = [];
      const resized: PortfolioRebalance['resized'] = [];

      // Find added positions
      Array.from(currMap.entries()).forEach(([key, pos]) => {
        if (!prevMap.has(key)) {
          added.push({ ticker: pos.ticker, direction: pos.direction, allocation: pos.allocation_pct });
        }
      });

      // Find removed positions with realized PnL
      Array.from(prevMap.entries()).forEach(([key, pos]) => {
        if (!currMap.has(key)) {
          let pnl_pct: number | null = null;
          if (pos.entry_price && pos.current_price) {
            const raw = (pos.current_price - pos.entry_price) / pos.entry_price;
            pnl_pct = (pos.direction === 'long' ? raw : -raw) * 100;
          }
          removed.push({ ticker: pos.ticker, direction: pos.direction, pnl_pct });
        }
      });

      // Find resized positions
      Array.from(currMap.entries()).forEach(([key, currP]) => {
        const prevP = prevMap.get(key);
        if (prevP && Math.abs(currP.allocation_pct - prevP.allocation_pct) >= 1) {
          resized.push({
            ticker: currP.ticker,
            direction: currP.direction,
            from: prevP.allocation_pct,
            to: currP.allocation_pct,
          });
        }
      });

      // Find house prediction drivers
      const drivers: string[] = [];
      const { data: newPreds } = await supabase
        .from('house_predictions')
        .select('claim, asset, direction, confidence')
        .gte('created_at', prev.generated_at)
        .lt('created_at', curr.generated_at)
        .order('confidence', { ascending: false })
        .limit(5);

      for (const p of newPreds || []) {
        const arrow = p.direction === 'long' ? '↑' : '��';
        drivers.push(`${arrow} ${p.asset} ${p.confidence}% — ${p.claim.length > 55 ? p.claim.slice(0, 55) + '…' : p.claim}`);
      }

      if (added.length > 0 || removed.length > 0 || resized.length > 0) {
        rebalances.push({
          date: curr.generated_at.slice(0, 10),
          reasoning: curr.rebalance_reasoning || '',
          risk_posture: curr.risk_posture || '',
          added,
          removed,
          resized,
          drivers,
        });
      }
    }

    return rebalances;
  } catch {
    return [];
  }
}

export async function getPortfolioPerformance(snapshotId: string, limit = 90): Promise<PortfolioPerformance[]> {
  if (!hasSupabase) return [];
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('portfolio_performance')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('date', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data as PortfolioPerformance[];
  } catch {
    return [];
  }
}
