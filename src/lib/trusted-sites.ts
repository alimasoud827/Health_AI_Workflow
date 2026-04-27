/** Hostname suffixes for allowlisted institutions (subdomains allowed). */
const TRUSTED_SUFFIXES = [
  "who.int",
  "cdc.gov",
  "nih.gov",
  "nlm.nih.gov",
  "mayoclinic.org",
  "nhs.uk",
  "healthline.com",
];

/**
 * Curated evergreen pages on AI / digital health from allowlisted domains.
 * Supplements PubMed discovery so short runs still return diverse sources.
 */
export const CURATED_TRUSTED_URLS: string[] = [
  "https://www.who.int/health-topics/digital-health",
  "https://www.who.int/news/item/20-03-2026-towards-responsible-ai-for-mental-health-and-well-being--experts-chart-a-way-forward",
  "https://www.ncbi.nlm.nih.gov/books/NBK597014/",
];

export function isTrustedUrl(urlString: string): boolean {
  try {
    const host = new URL(urlString).hostname.toLowerCase().replace(/^www\./, "");
    return TRUSTED_SUFFIXES.some(
      (s) => host === s || host.endsWith(`.${s}`)
    );
  } catch {
    return false;
  }
}
