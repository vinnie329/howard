import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { analyzeContent } from '@/lib/analysis/analyzeContent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_id, platform, url, title, published_at, pdf_base64, source_name } = body;
    let { raw_text } = body;

    if (!source_id || !title) {
      return NextResponse.json(
        { error: 'source_id and title are required' },
        { status: 400 }
      );
    }

    // Extract text from PDF if provided
    if (pdf_base64) {
      try {
        const pdf = (await import('pdf-parse')).default;
        const buffer = Buffer.from(pdf_base64, 'base64');
        const data = await pdf(buffer);
        raw_text = data.text;
      } catch {
        return NextResponse.json(
          { error: 'Failed to parse PDF. Ensure the file is a valid PDF.' },
          { status: 400 }
        );
      }
    }

    if (!raw_text) {
      return NextResponse.json(
        { error: 'Either content text or a PDF file is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Insert content
    const { data: contentRow, error: contentError } = await supabase
      .from('content')
      .insert({
        source_id,
        platform: platform || 'other',
        external_id: `manual-${Date.now()}`,
        title,
        url: url || null,
        published_at: published_at || new Date().toISOString(),
        raw_text,
      })
      .select()
      .single();

    if (contentError) {
      return NextResponse.json({ error: contentError.message }, { status: 500 });
    }

    // Analyze content with Claude
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && raw_text.length > 100) {
      try {
        const result = await analyzeContent(
          title,
          raw_text,
          source_name || 'Unknown',
          anthropicKey,
        );

        // Insert analysis
        await supabase.from('analyses').insert({
          content_id: contentRow.id,
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

        // Insert predictions
        for (const pred of result.predictions) {
          await supabase.from('predictions').insert({
            content_id: contentRow.id,
            source_id,
            claim: pred.claim,
            asset_or_theme: pred.asset_or_theme,
            direction: pred.direction,
            time_horizon: pred.time_horizon,
            confidence: pred.confidence,
            status: 'pending',
          });
        }
      } catch (err) {
        // Analysis failure shouldn't block content creation
        console.error('Analysis failed:', err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json(contentRow, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
