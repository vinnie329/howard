// Substack fetcher — pulls paid newsletter content from Gmail via OAuth2

import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';

// Map Substack sender email → source slug
// Substack emails come from "<publication>@substack.com"
const SUBSTACK_SENDERS: Record<string, string> = {
  'capitalwars@substack.com': 'michael-howell',
  'campbellramble@substack.com': 'campbell-ramble',
  'importai@substack.com': 'jack-clark',
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

        // Use Gmail message ID as external_id
        const externalId = `substack-${msg.id}`;

        // Check if we already have this
        const { data: existing } = await supabase
          .from('content')
          .select('id')
          .eq('platform', 'substack')
          .eq('external_id', externalId)
          .single();

        if (existing) {
          console.log(`    ~ Already exists: ${subject}`);
          continue;
        }

        // Extract article text from email HTML
        const html = extractHtmlBody(msgData.payload);
        if (!html) {
          console.log(`    ✕ No HTML body: ${subject}`);
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
          url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
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
