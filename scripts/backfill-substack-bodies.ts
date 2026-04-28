/**
 * Backfill substack content rows that captured only the headline/teaser
 * because the original extractor read text/html (which Substack often
 * leaves nearly empty) instead of text/plain (which has the full article).
 *
 * Iterates content where platform='substack' and raw_text is short
 * (<3000 chars), re-fetches the Gmail message via OAuth, re-extracts
 * preferring text/plain, and updates raw_text + reanalyzes.
 *
 *   npx tsx scripts/backfill-substack-bodies.ts                # dry-run
 *   npx tsx scripts/backfill-substack-bodies.ts --apply        # write
 *   npx tsx scripts/backfill-substack-bodies.ts --apply --reanalyze  # write + re-run analysis
 */
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { analyzeContent } from '../src/lib/analysis/analyzeContent';

const apply = process.argv.includes('--apply');
const reanalyze = process.argv.includes('--reanalyze');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
}
interface GmailMessage {
  id: string;
  payload: GmailPart;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractMimePart(payload: GmailPart, mimeType: string): string | null {
  if (payload.body?.data && (!payload.parts || payload.parts.length === 0)) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === mimeType && part.body?.data) return decodeBase64Url(part.body.data);
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === mimeType && sub.body?.data) return decodeBase64Url(sub.body.data);
        }
      }
    }
  }
  return null;
}

function cleanPlainText(plain: string): string {
  let t = plain;
  t = t.replace(/^View this post on the web at[^\n]*\n+/i, '');
  const u = t.search(/\n\s*Unsubscribe\s+https?:\/\//i);
  if (u > 0) t = t.slice(0, u);
  t = t.replace(/\n\s*Get the (?:Substack )?app[^\n]*\n+/gi, '\n');
  t = t.replace(/\n\s*Read on Substack[^\n]*\n+/gi, '\n');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function extractArticleText(html: string): string {
  const $ = cheerio.load(html);
  $('a:contains("View in browser")').closest('div').remove();
  $('a:contains("Unsubscribe")').closest('div').remove();
  $('a:contains("Share")').closest('div').remove();
  $('a:contains("Subscribe")').closest('div').remove();
  $('.footer').remove();
  $('[class*="footer"]').remove();
  $('[class*="header"]').remove();
  $('style').remove();
  return (
    $('div.body').text().trim() ||
    $('article').text().trim() ||
    $('td').filter((_, el) => $(el).text().trim().length > 500).first().text().trim() ||
    $.root().text().trim()
  ).replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`OAuth: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function fetchMessage(token: string, msgId: string): Promise<GmailMessage | null> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}${reanalyze ? ' (with reanalyze)' : ''}\n`);

  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    console.error('Missing Gmail OAuth env vars (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN). Run from a machine that has the secrets.');
    process.exit(1);
  }

  // Find thin substack rows (raw_text shorter than what a real article would be)
  const { data: thin } = await sb.from('content')
    .select('id, title, raw_text, external_id, source_id, sources(name)')
    .eq('platform', 'substack')
    .order('published_at', { ascending: false })
    .limit(500);

  const candidates = (thin || []).filter((c) => (c.raw_text?.length || 0) < 3000 && c.external_id?.startsWith('substack-'));
  console.log(`Found ${candidates.length} thin substack rows to attempt backfill.\n`);

  const token = await getAccessToken();
  let recovered = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const c of candidates) {
    const src = (c.sources as unknown as { name?: string } | null)?.name;
    const msgId = c.external_id!.replace(/^substack-/, '');
    const msg = await fetchMessage(token, msgId);
    if (!msg) { console.log(`  ✕ ${src} | ${c.title.slice(0, 60)} — Gmail message not found`); skipped++; continue; }

    const html = extractMimePart(msg.payload, 'text/html') ?? '';
    const plain = extractMimePart(msg.payload, 'text/plain');
    const htmlText = html ? extractArticleText(html) : '';
    const plainText = plain ? cleanPlainText(plain) : '';
    const next = plainText.length > htmlText.length ? plainText : htmlText;
    const before = c.raw_text?.length || 0;
    const after = next.length;

    if (after <= before + 100) {
      // Not materially better — skip.
      console.log(`  · ${src} | ${c.title.slice(0, 50)} — ${before} → ${after} (no improvement)`);
      unchanged++;
      continue;
    }

    console.log(`  + ${src} | ${c.title.slice(0, 50)} — ${before} → ${after} chars`);
    if (apply) {
      const trunc = next.slice(0, 50000);
      const { error } = await sb.from('content').update({ raw_text: trunc }).eq('id', c.id);
      if (error) { console.log(`    update error: ${error.message}`); continue; }
      recovered++;

      if (reanalyze) {
        try {
          const result = await analyzeContent(c.title, trunc, src || 'Unknown', process.env.ANTHROPIC_API_KEY!);
          // Replace existing analysis row (insert may conflict — fall back to delete+insert)
          await sb.from('analyses').delete().eq('content_id', c.id);
          await sb.from('analyses').insert({
            content_id: c.id,
            display_title: result.display_title,
            sentiment_overall: result.sentiment_overall,
            sentiment_score: result.sentiment_score,
            assets_mentioned: result.assets_mentioned,
            themes: result.themes,
            predictions: result.predictions.map((p) => p.claim),
            key_quotes: result.key_quotes,
            referenced_people: result.referenced_people,
            summary: result.summary,
          });
          // Replace predictions
          await sb.from('predictions').delete().eq('content_id', c.id);
          for (const p of result.predictions) {
            await sb.from('predictions').insert({
              content_id: c.id,
              source_id: c.source_id,
              claim: p.claim,
              themes: p.themes,
              assets_mentioned: p.assets_mentioned,
              sentiment: p.sentiment,
              time_horizon: p.time_horizon,
              confidence: p.confidence,
              specificity: p.specificity,
              date_made: new Date().toISOString(),
            });
          }
          console.log(`    re-analyzed: ${result.display_title?.slice(0, 60)} (${result.predictions.length} preds)`);
        } catch (e) {
          console.log(`    re-analysis failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
  }

  console.log(`\nRecovered: ${recovered}, unchanged: ${unchanged}, skipped: ${skipped}`);
  if (!apply) console.log(`Re-run with --apply to write. Add --reanalyze to also refresh analyses + predictions.`);
}
main().catch(console.error);
