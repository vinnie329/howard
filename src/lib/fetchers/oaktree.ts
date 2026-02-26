import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';

const OAKTREE_INSIGHTS_URL = 'https://www.oaktreecapital.com/insights';

export async function fetchOaktreeMemos(
  supabase: SupabaseClient,
  sourceId: string
): Promise<number> {
  let inserted = 0;

  try {
    const res = await fetch(OAKTREE_INSIGHTS_URL, {
      headers: {
        'User-Agent': 'Howard Intelligence Tracker/1.0',
      },
    });

    if (!res.ok) {
      console.error(`  Oaktree fetch error: ${res.status} ${res.statusText}`);
      return 0;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Find memo links on the insights page
    const memoLinks: Array<{ url: string; title: string }> = [];

    $('a[href*="/insights/memo/"], a[href*="/insights/howard-marks-memos/"]').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      if (href && title && title.length > 5) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://www.oaktreecapital.com${href}`;
        memoLinks.push({ url: fullUrl, title });
      }
    });

    // Deduplicate by URL
    const uniqueMemos = Array.from(
      new Map(memoLinks.map((m) => [m.url, m])).values()
    ).slice(0, 10); // Limit to 10 most recent

    for (const memo of uniqueMemos) {
      try {
        // Check if we already have this
        const { data: existing } = await supabase
          .from('content')
          .select('id')
          .eq('url', memo.url)
          .single();

        if (existing) continue;

        // Fetch the memo page
        const memoRes = await fetch(memo.url, {
          headers: {
            'User-Agent': 'Howard Intelligence Tracker/1.0',
          },
        });

        if (!memoRes.ok) continue;

        const memoHtml = await memoRes.text();
        const memo$ = cheerio.load(memoHtml);

        // Extract content — try Oaktree-specific selectors first, then fallbacks
        const bodyText =
          memo$('.article-content').text().trim() ||
          memo$('.article-body').text().trim() ||
          memo$('.memo-content').text().trim() ||
          memo$('.content-body').text().trim() ||
          memo$('article').text().trim() ||
          memo$('.entry-content').text().trim() ||
          '';

        // Extract date
        const dateStr =
          memo$('time').attr('datetime') ||
          memo$('.date').text().trim() ||
          memo$('.published-date').text().trim() ||
          new Date().toISOString();

        const { error } = await supabase.from('content').insert({
          source_id: sourceId,
          platform: 'oaktree',
          external_id: memo.url,
          title: memo.title,
          url: memo.url,
          published_at: new Date(dateStr).toISOString(),
          raw_text: bodyText.slice(0, 50000), // Cap at 50k chars
        });

        if (error) {
          console.error(`  Error inserting memo "${memo.title}":`, error.message);
        } else {
          inserted++;
          console.log(`    + ${memo.title}`);
        }
      } catch (err) {
        console.error(`  Error fetching memo "${memo.title}":`, err);
      }
    }
  } catch (err) {
    console.error('  Error fetching Oaktree insights page:', err);
  }

  return inserted;
}
