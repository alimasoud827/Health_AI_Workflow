/**
 * NIH NCBI E-utilities (no API key) — literature search, not a news feed.
 */
export async function searchPubMedForTopic(
  topic: string,
  max = 4
): Promise<string[]> {
  const cleaned = topic.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const term = encodeURIComponent(
    `((${cleaned})) AND (artificial intelligence OR machine learning OR "large language model" OR "deep learning" OR neural)`
  );

  const url =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed` +
    `&retmode=json&retmax=${max}&sort=relevance&term=${term}` +
    `&tool=ai_health_research_agent&email=dev@localhost`;

  const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = data.esearchresult?.idlist ?? [];
  return ids.map((id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`);
}
