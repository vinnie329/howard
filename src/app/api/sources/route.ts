import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { calculateWeightedScore } from '@/lib/scoring';
import type { CredibilityScores } from '@/types';
import { generateEmbedding, prepareSourceText, toVectorString } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bio, domains, scores } = body;

    if (!name || !scores || !domains || domains.length === 0) {
      return NextResponse.json(
        { error: 'name, domains, and scores are required' },
        { status: 400 }
      );
    }

    const typedScores = scores as CredibilityScores;
    const weightedScore = calculateWeightedScore(typedScores);

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('sources')
      .insert({
        name,
        slug,
        bio: bio || '',
        avatar_url: '',
        domains,
        scores: typedScores,
        weighted_score: weightedScore,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate embedding (non-blocking)
    if (process.env.VOYAGE_API_KEY && data) {
      try {
        const emb = await generateEmbedding(prepareSourceText(name, bio || '', domains));
        await supabase.from('sources').update({ embedding: toVectorString(emb) }).eq('id', data.id);
      } catch (embErr) {
        console.error('Source embedding failed:', embErr instanceof Error ? embErr.message : embErr);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
