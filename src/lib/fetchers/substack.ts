// Substack fetcher — pulls paid newsletter content from Gmail via OAuth2

import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';

// Map Substack sender email → source slug
// Substack emails come from "<publication>@substack.com"
const SUBSTACK_SENDERS: Record<string, string> = {
  'capitalwars@substack.com': 'michael-howell',
  'campbellramble@substack.com': 'campbell-ramble',
  'importai@substack.com': 'jack-clark',
  'michaeljburry@substack.com': 'mike-burry',
  'taekim@substack.com': 'tae-kim',
  'eladgil@substack.com': 'elad-gil',
};

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageFull {
  id: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<{
        mimeType: string;
        body?: { data?: string };
      }>;
    }>;
  };
  internalDate: string;
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OAuth token refresh failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

function getHeader(msg: GmailMessageFull, name: string): string {
  return msg.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value || '';
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractHtmlBody(payload: GmailMessageFull['payload']): string | null {
  // Direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Search parts for text/html
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      // Nested multipart
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === 'text/html' && sub.body?.data) {
            return decodeBase64Url(sub.body.data);
          }
        }
      }
    }
    // Fallback to text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
  }

  return null;
}

/**
 * Decode a Substack redirect URL to get the real post URL.
 * Redirect URLs contain a base64-encoded JSON payload with the target URL in the "e" field.
 */
function resolveRedirectUrl(url: string): string {
  if (!url.includes('substack.com/redirect/')) return url;
  try {
    // URL format: https://substack.com/redirect/2/<base64-payload>?...
    const pathParts = new URL(url).pathname.split('/');
    const payload = pathParts[pathParts.length - 1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    if (decoded.e && typeof decoded.e === 'string') {
      // The "e" field contains the real URL (sometimes with tracking params)
      const realUrl = new URL(decoded.e);
      // Strip tracking params, keep just the clean post URL
      return `${realUrl.origin}${realUrl.pathname}`;
    }
  } catch {}
  return url;
}

function extractPostUrl(html: string): string | null {
  const $ = cheerio.load(html);
  // Substack emails have a "View in browser" or "View online" link to the actual post
  let rawUrl =
    $('a:contains("View in browser")').attr('href') ||
    $('a:contains("View online")').attr('href') ||
    $('a:contains("Read in browser")').attr('href') ||
    $('a:contains("Read online")').attr('href') ||
    null;

  // Fallback: find any link to a substack.com/p/ URL (the post URL pattern)
  if (!rawUrl) {
    $('a[href*="substack.com/p/"]').each((_, el) => {
      if (!rawUrl) rawUrl = $(el).attr('href') || null;
    });
  }

  if (!rawUrl) return null;

  // Resolve redirect URLs to get the actual post URL
  return resolveRedirectUrl(rawUrl);
}

function extractArticleText(html: string): string {
  const $ = cheerio.load(html);

  // Remove Substack boilerplate elements
  $('a:contains("View in browser")').closest('div').remove();
  $('a:contains("Unsubscribe")').closest('div').remove();
  $('a:contains("Share")').closest('div').remove();
  $('a:contains("Subscribe")').closest('div').remove();
  $('.footer').remove();
  $('[class*="footer"]').remove();
  $('[class*="header"]').remove();
  $('style').remove();

  // Try to find the main content area
  // Substack emails typically wrap content in a table-based layout
  const bodyText =
    $('div.body').text().trim() ||
    $('article').text().trim() ||
    $('td').filter((_, el) => {
      const text = $(el).text().trim();
      return text.length > 500; // Find the main content cell
    }).first().text().trim() ||
    $.root().text().trim();

  // Clean up whitespace
  return bodyText
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function fetchSubstackEmails(
  supabase: SupabaseClient,
  sourceSlugToId: Record<string, string>
): Promise<number> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('  Substack: skipped (no Gmail credentials)');
    return 0;
  }

  let inserted = 0;

  try {
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Build Gmail search query for all Substack senders
    const senderQueries = Object.keys(SUBSTACK_SENDERS)
      .map((s) => `from:${s}`)
      .join(' OR ');
    const query = `(${senderQueries}) newer_than:7d`;

    console.log(`  Substack: searching Gmail for recent newsletters...`);

    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error(`  Substack: Gmail search error: ${searchRes.status} ${err.slice(0, 200)}`);
      return 0;
    }

    const searchData = await searchRes.json();
    const messages: GmailMessage[] = searchData.messages || [];

    console.log(`  Substack: found ${messages.length} emails`);

    for (const msg of messages) {
      try {
        // Fetch full message
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!msgRes.ok) continue;

        const msgData: GmailMessageFull = await msgRes.json();
        const from = getHeader(msgData, 'From');
        const subject = getHeader(msgData, 'Subject');
        const date = getHeader(msgData, 'Date');

        // Match sender to a source
        const senderEmail = from.match(/<([^>]+)>/)?.[1]?.toLowerCase() || from.toLowerCase();
        const sourceSlug = Object.entries(SUBSTACK_SENDERS).find(
          ([email]) => senderEmail.includes(email) || email.includes(senderEmail)
        )?.[1];

        if (!sourceSlug) {
          console.log(`    ✕ Unknown sender: ${from}`);
          continue;
        }

        const sourceId = sourceSlugToId[sourceSlug];
        if (!sourceId) {
          console.log(`    ✕ No source found for slug: ${sourceSlug}`);
          continue;
        }

        // Skip non-content emails (invoices, receipts, promos, account notifications)
        const subjectLower = subject.toLowerCase();
        const NON_CONTENT_PATTERNS = [
          'invoice', 'receipt', 'payment', 'billing', 'subscription',
          'your card', 'charge', 'renew', 'expired', 'update your',
          'welcome to', 'confirm your', 'verify your', 'reset your',
          'referral', 'invite', 'gift', 'discount', 'off your',
          'black friday', 'cyber monday', 'special offer', 'limited time',
          'founding member', 'upgrade to paid', 'go paid', 'subscribe to',
          'thank you for subscribing', 'thanks for subscribing',
          'your subscription', 'manage your subscription',
        ];
        if (NON_CONTENT_PATTERNS.some(p => subjectLower.includes(p))) {
          console.log(`    ✕ Skipped (non-content): ${subject}`);
          continue;
        }

        // Extract HTML and post URL first (needed for dedup)
        const html = extractHtmlBody(msgData.payload);
        if (!html) {
          console.log(`    ✕ No HTML body: ${subject}`);
          continue;
        }

        const postUrl = extractPostUrl(html);
        const contentUrl = postUrl || `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`;

        const externalId = `substack-${msg.id}`;

        // Dedup: check by external_id OR by post URL (catches manual additions)
        const { data: existingById } = await supabase
          .from('content')
          .select('id')
          .eq('external_id', externalId)
          .single();

        if (existingById) {
          console.log(`    ~ Already exists: ${subject}`);
          continue;
        }

        {
          const { data: existingByUrl } = await supabase
            .from('content')
            .select('id')
            .eq('url', contentUrl)
            .single();

          if (existingByUrl) {
            console.log(`    ~ Already exists (by URL): ${subject}`);
            continue;
          }
        }

        // Title-based dedup as final safety net (same source + similar title)
        const { data: existingByTitle } = await supabase
          .from('content')
          .select('id')
          .eq('source_id', sourceId)
          .eq('platform', 'substack')
          .ilike('title', subject.split(' - ')[0].trim() + '%')
          .limit(1)
          .single();

        if (existingByTitle) {
          console.log(`    ~ Already exists (by title): ${subject}`);
          continue;
        }

        const rawText = extractArticleText(html);
        if (rawText.length < 100) {
          console.log(`    ✕ Too short (${rawText.length} chars): ${subject}`);
          continue;
        }

        const publishedAt = date
          ? new Date(date).toISOString()
          : new Date(parseInt(msgData.internalDate)).toISOString();

        const { error } = await supabase.from('content').insert({
          source_id: sourceId,
          platform: 'substack',
          external_id: externalId,
          title: subject,
          url: contentUrl,
          published_at: publishedAt,
          raw_text: rawText.slice(0, 50000),
        });

        if (error) {
          if (error.code === '23505') {
            console.log(`    ~ Already exists (duplicate): ${subject}`);
          } else {
            console.error(`    ✕ DB error: ${error.message}`);
          }
        } else {
          inserted++;
          console.log(`    + ${subject} (${rawText.length} chars)`);
        }
      } catch (err) {
        console.error(`    ✕ Error processing message: ${err instanceof Error ? err.message : err}`);
      }
    }
  } catch (err) {
    console.error(`  Substack: error: ${err instanceof Error ? err.message : err}`);
  }

  return inserted;
}
