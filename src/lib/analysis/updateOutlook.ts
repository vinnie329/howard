import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

interface AnalyzedContentInput {
  title: string;
  sourceName: string;
  weightedScore: number;
  sentiment: string;
  sentimentScore: number;
  themes: string[];
  summary: string;
  predictions: string[];
}

interface OutlookUpdateResult {
  should_update: boolean;
  reasoning: string;
  updated_thesis_intro?: string;
  updated_thesis_points?: { heading: string; content: string }[];
  updated_positioning?: string[];
  updated_sentiment?: string;
  new_themes?: string[];
}

const TIME_HORIZONS = ['short', 'medium', 'long'] as const;

export async function updateOutlook(
  content: AnalyzedContentInput,
  apiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<void> {
  const client = new Anthropic({ apiKey });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  for (const horizon of TIME_HORIZONS) {
    const { data: currentOutlook } = await supabase
      .from('outlook')
      .select('*')
      .eq('time_horizon', horizon)
      .eq('domain', 'general')
      .single();

    if (!currentOutlook) {
      console.log(`  No existing ${horizon}-term outlook to update`);
      continue;
    }

    try {
      const currentPoints = (currentOutlook.thesis_points || []) as { heading: string; content: string }[];
      const currentPositioning = (currentOutlook.positioning || []) as string[];

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are Howard, a financial intelligence system. You maintain structured market outlooks across three time horizons.

Current ${horizon}-term outlook:
- Title: ${currentOutlook.title}
- Intro: ${currentOutlook.thesis_intro}
- Thesis Points: ${JSON.stringify(currentPoints)}
- Positioning: ${JSON.stringify(currentPositioning)}
- Key themes: ${JSON.stringify(currentOutlook.key_themes)}
- Sentiment: ${currentOutlook.sentiment}
- Confidence: ${currentOutlook.confidence}%

New information from ${content.sourceName} (credibility score: ${content.weightedScore.toFixed(2)}):
- Title: ${content.title}
- Sentiment: ${content.sentiment} (${content.sentimentScore.toFixed(2)})
- Themes: ${content.themes.join(', ')}
- Summary: ${content.summary}
- Predictions: ${content.predictions.join('; ') || 'none'}

Based on this new information, should the ${horizon}-term outlook be updated?

Consider:
1. Does this confirm, contradict, or add nuance to the existing thesis?
2. How credible is this source relative to others?
3. Is this information actionable for this time horizon?

Respond in JSON only (no markdown fences):
{
  "should_update": boolean,
  "reasoning": "brief explanation of why or why not",
  "updated_thesis_intro": "updated intro paragraph if should_update, otherwise null",
  "updated_thesis_points": [{"heading": "...", "content": "..."}] or null,
  "updated_positioning": ["positioning statement 1", ...] or null,
  "updated_sentiment": "bullish/bearish/cautious/neutral if changed, otherwise null",
  "new_themes": ["any new themes to add, empty array if none"]
}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') continue;

      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const result = JSON.parse(jsonStr) as OutlookUpdateResult;
      console.log(`    ${horizon}-term: ${result.reasoning}`);

      if (result.should_update) {
        const existingThemes = (currentOutlook.key_themes || []) as string[];
        const mergedThemes = result.new_themes && result.new_themes.length > 0
          ? Array.from(new Set([...existingThemes, ...result.new_themes]))
          : existingThemes;

        const updatePayload: Record<string, unknown> = {
          key_themes: mergedThemes,
          last_updated: new Date().toISOString(),
        };

        if (result.updated_thesis_intro) {
          updatePayload.thesis_intro = result.updated_thesis_intro;
        }
        if (result.updated_thesis_points) {
          updatePayload.thesis_points = result.updated_thesis_points;
        }
        if (result.updated_positioning) {
          updatePayload.positioning = result.updated_positioning;
        }
        if (result.updated_sentiment) {
          updatePayload.sentiment = result.updated_sentiment;
        }

        const { error } = await supabase
          .from('outlook')
          .update(updatePayload)
          .eq('time_horizon', horizon)
          .eq('domain', 'general');

        if (error) {
          console.error(`    Error updating ${horizon}-term outlook:`, error.message);
        } else {
          console.log(`    Updated ${horizon}-term outlook`);
        }
      }
    } catch (err) {
      console.error(`    ${horizon}-term outlook check failed:`, err instanceof Error ? err.message : err);
    }
  }
}
