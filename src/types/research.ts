export type ResearchArticle = {
  url: string;
  title: string;
  source: string;
  date?: string;
  snippet: string;
};

export type SourceSummary = ResearchArticle & { summary: string };

export type ResearchReport = {
  overview: string;
  recentDevelopments: string;
  benefits: string;
  risks: string;
  takeaway: string;
};

export type ResearchResult = {
  topic: string;
  sources: SourceSummary[];
  report: ResearchReport;
  error?: string;
};

export type FetchedPage = { url: string; html: string };
