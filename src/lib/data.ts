import { getSupabaseClient } from './supabase';
import { getSupabaseServiceClient } from './supabase';
import { generateEmbedding, toVectorString } from './embeddings';
import type { Source, Analysis, ContentWithAnalysis, Prediction, Outlook, OutlookHistory, TrendingTopic } from '@/types';
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

    if (contentErr || !content) return null;

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
      created_at: p.created_at,
    }));

    return {
      id: content.id,
      source,
      title: content.title,
      url: content.url || '',
      platform: content.platform,
      published_at: content.published_at,
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
      const { generateEmbedding: genEmb, preparePredictionText } = await import('./embeddings');
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
