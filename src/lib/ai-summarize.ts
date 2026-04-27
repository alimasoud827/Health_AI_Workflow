import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ResearchArticle, ResearchReport, SourceSummary } from "@/types/research";

function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function summarizeWithModel(article: ResearchArticle): Promise<string> {
  const body = `${article.title}\n\n${article.snippet}`.slice(0, 12_000);

  if (hasOpenAI()) {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt:
        `Summarize this trusted health / research page in 2–4 sentences for clinicians or policy readers. ` +
        `Stay faithful to the excerpt; do not invent studies, numbers, or approvals.\n\n${body}`,
    });
    return text.trim();
  }

  const s = article.snippet.replace(/\s+/g, " ").trim();
  return s.length > 560 ? `${s.slice(0, 560)}…` : s;
}

function heuristicReport(
  topic: string,
  sources: Pick<SourceSummary, "summary">[]
): ResearchReport {
  const joined = sources.map((s) => s.summary).join("\n\n");
  const preview = joined.length > 600 ? `${joined.slice(0, 600)}…` : joined;

  return {
    overview: `This desk review compiles ${sources.length} allowlisted source(s) on “${topic}”. ${preview}`,
    recentDevelopments:
      "Trusted outlets and indexed literature continue to emphasize governance, independent validation, and clear human oversight before clinical use.",
    benefits:
      "Reported upside often includes decision support, documentation assistance, earlier signal detection in data-rich settings, and workflow efficiency when models are well validated.",
    risks:
      "Documented concerns include dataset bias, opacity of some systems, privacy and security, automation bias, and the need for equity-focused evaluation.",
    takeaway:
      "Treat AI as an assistive layer: require validation for your context, monitor performance across groups, and keep clinicians accountable for decisions.",
  };
}

export async function combineReportWithModel(
  topic: string,
  sources: SourceSummary[]
): Promise<ResearchReport> {
  if (sources.length === 0) {
    return {
      overview: "No sources were available to summarize.",
      recentDevelopments: "",
      benefits: "",
      risks: "",
      takeaway: "Try a broader or alternative phrasing of your topic.",
    };
  }

  const pack = sources
    .map(
      (s, i) =>
        `### Source ${i + 1}: ${s.title}\nURL: ${s.url}\n${s.summary}`
    )
    .join("\n\n");

  if (hasOpenAI()) {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt:
          `Topic: ${topic}\n\nYou are writing a short research brief using ONLY the themes present in these summaries from trusted pages. ` +
          `Return ONLY valid minified JSON with keys: ` +
          `"overview","recentDevelopments","benefits","risks","takeaway". ` +
          `Each value is 1–3 short paragraphs in plain language. If evidence is thin, say so explicitly. No markdown fences.\n\n${pack}`,
      });

      const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      return {
        overview: String(parsed.overview ?? ""),
        recentDevelopments: String(parsed.recentDevelopments ?? ""),
        benefits: String(parsed.benefits ?? ""),
        risks: String(parsed.risks ?? ""),
        takeaway: String(parsed.takeaway ?? ""),
      };
    } catch {
      /* fall through */
    }
  }

  return heuristicReport(topic, sources);
}
