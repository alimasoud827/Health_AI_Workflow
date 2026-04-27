import type {
  FetchedPage,
  ResearchArticle,
  ResearchReport,
  ResearchResult,
  SourceSummary,
} from "@/types/research";
import { extractReadableContent } from "@/lib/extract-html";
import { searchPubMedForTopic } from "@/lib/pubmed";
import {
  CURATED_TRUSTED_URLS,
  isTrustedUrl,
} from "@/lib/trusted-sites";
function emptyReport(message: string): ResearchReport {
  return {
    overview: message,
    recentDevelopments: "",
    benefits: "",
    risks: "",
    takeaway: "",
  };
}

async function buildQueries(topic: string): Promise<string[]> {
  "use step";

  const core = topic.replace(/\s+/g, " ").trim();
  return [
    `${core} artificial intelligence healthcare`,
    `${core} machine learning clinical`,
    `${core} medical AI safety ethics`,
  ];
}

async function findSourceUrls(
  topic: string,
  queries: string[]
): Promise<string[]> {
  "use step";

  const pubmed = await searchPubMedForTopic(queries[0] ?? topic, 4);
  const pool = [...new Set([...pubmed, ...CURATED_TRUSTED_URLS])];
  const trusted = pool.filter(isTrustedUrl);
  return trusted.slice(0, 5);
}

async function fetchPages(urls: string[]): Promise<FetchedPage[]> {
  "use step";

  const out: FetchedPage[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "AIHealthResearchAgent/1.0 (educational research; +https://vercel.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(22_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length > 200) out.push({ url, html });
    } catch {
      /* skip failed fetches */
    }
  }
  return out;
}

async function extractArticlesFromPages(
  pages: FetchedPage[]
): Promise<ResearchArticle[]> {
  "use step";

  const articles: ResearchArticle[] = [];
  for (const p of pages) {
    const article = extractReadableContent(p.url, p.html);
    if (article.snippet.replace(/\s+/g, "").length > 50) {
      articles.push(article);
    }
  }
  return articles.slice(0, 5);
}

async function summarizeSource(
  article: ResearchArticle
): Promise<SourceSummary> {
  "use step";

  const { summarizeWithModel } = await import("@/lib/ai-summarize");
  const summary = await summarizeWithModel(article);
  return { ...article, summary };
}

async function combineSummaries(
  topic: string,
  summaries: SourceSummary[]
): Promise<ResearchReport> {
  "use step";

  const { combineReportWithModel } = await import("@/lib/ai-summarize");
  return combineReportWithModel(topic, summaries);
}

export async function researchWorkflow(topic: string): Promise<ResearchResult> {
  "use workflow";

  const normalized = topic.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return {
      topic: "",
      sources: [],
      report: emptyReport("Enter a topic to start research."),
      error: "empty_topic",
    };
  }

  const queries = await buildQueries(normalized);
  const urls = await findSourceUrls(normalized, queries);
  const pages = await fetchPages(urls);
  const articles = await extractArticlesFromPages(pages);

  if (articles.length === 0) {
    return {
      topic: normalized,
      sources: [],
      report: emptyReport(
        "No readable pages were retrieved from trusted sites. Try a broader topic, or try again later."
      ),
      error: "no_sources",
    };
  }

  const sources: SourceSummary[] = [];
  for (const a of articles) {
    sources.push(await summarizeSource(a));
  }

  const report = await combineSummaries(normalized, sources);

  return {
    topic: normalized,
    sources,
    report,
  };
}
