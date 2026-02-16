import { NextResponse } from 'next/server';

const QUERIES = ['stock market', 'commodities gold', 'crypto bitcoin', 'semiconductor AI'];

interface YahooNewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  relatedTickers?: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  ago: string;
  tickers: string[];
}

function timeAgo(epoch: number): string {
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function fetchNews(query: string): Promise<YahooNewsItem[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=5&quotesCount=0`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.news ?? [];
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.all(QUERIES.map(fetchNews));
  const allNews = results.flat();

  // Deduplicate by uuid
  const seen = new Set<string>();
  const unique: NewsItem[] = [];
  for (const item of allNews) {
    if (seen.has(item.uuid)) continue;
    seen.add(item.uuid);
    unique.push({
      id: item.uuid,
      title: item.title,
      publisher: item.publisher,
      url: item.link,
      publishedAt: new Date(item.providerPublishTime * 1000).toISOString(),
      ago: timeAgo(item.providerPublishTime),
      tickers: (item.relatedTickers ?? []).slice(0, 5),
    });
  }

  // Sort by most recent
  unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json(unique.slice(0, 12), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' },
  });
}
