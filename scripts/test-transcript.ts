async function getTranscriptInnertube(videoId: string): Promise<string | null> {
  // Use YouTube's innertube API directly — no auth needed
  const body = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240313.00.00',
      },
    },
    params: btoa(`\n\x0b${videoId}`),
  };

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.log('Innertube error:', res.status, await res.text().then(t => t.slice(0, 200)));
    return null;
  }

  const data = await res.json();
  const segments =
    data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer
      ?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer
      ?.initialSegments ||
    data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer
      ?.body?.transcriptBodyRenderer?.transcriptSegmentListRenderer?.initialSegments;

  if (!segments) {
    // Try alternate structure
    const renderer = JSON.stringify(data).match(/"transcriptSegmentRenderer"/) ? data : null;
    if (!renderer) {
      console.log('No transcript segments found in response');
      console.log('Keys:', JSON.stringify(data).slice(0, 500));
      return null;
    }
  }

  const texts: string[] = [];
  const findSegments = (obj: unknown): void => {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(findSegments); return; }
    const rec = obj as Record<string, unknown>;
    if ('transcriptSegmentRenderer' in rec) {
      const snippet = (rec.transcriptSegmentRenderer as Record<string, unknown>)?.snippet as Record<string, unknown>;
      const runs = snippet?.runs as Array<{ text: string }>;
      if (runs) texts.push(runs.map(r => r.text).join(''));
      return;
    }
    Object.values(rec).forEach(findSegments);
  };

  findSegments(data);

  if (texts.length === 0) {
    console.log('No text segments extracted');
    return null;
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const testIds = ['gzwRflcLPAA', 'Z_4uaToYgT8', 'EvBddHMCFNk'];
  for (const id of testIds) {
    console.log(`\n=== ${id} ===`);
    const transcript = await getTranscriptInnertube(id);
    if (transcript) {
      console.log('Length:', transcript.length);
      console.log('Preview:', transcript.slice(0, 200));
    } else {
      console.log('No transcript');
    }
  }
}
main();
