// Substack fetcher - to be implemented with RSS/API integration

export interface SubstackPost {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  publishedAt: string;
  url: string;
  bodyHtml: string;
}

export async function fetchSubstackPosts(
  _subdomain: string,
  _limit: number = 10
): Promise<SubstackPost[]> {
  // TODO: Implement Substack RSS feed parsing
  return [];
}
