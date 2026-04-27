# AI summarization (`ai-summarize`)

This module turns fetched **research articles** into per-source summaries and a single **structured research brief**. It is used by the research workflow after HTML has been extracted into `ResearchArticle` objects.

**Source:** `src/lib/ai-summarize.ts`  
**Types:** `src/types/research.ts`  
**Consumer:** `src/workflows/research-workflow.ts` (dynamic imports to keep workflow bundles lean)

## Dependencies

- [Vercel AI SDK](https://sdk.vercel.ai/docs) (`ai`) — `generateText`
- [@ai-sdk/openai](https://sdk.vercel.ai/providers/ai-sdk-providers/openai) — `openai()` provider
- Model in code: **`gpt-4o-mini`** (change in `ai-summarize.ts` if your org standard differs)

## Configuration

| Variable | Required | Effect |
|----------|----------|--------|
| `OPENAI_API_KEY` | Optional | If set (non-empty after trim), OpenAI is used for both summarization steps. If unset, **heuristic fallbacks** run with no external calls. |

Set the key in `.env.local` (Next.js) or your deployment environment. Never commit secrets.

## Public API

### `summarizeWithModel(article: ResearchArticle): Promise<string>`

Produces a short plain-text summary for one page.

**Input:** `ResearchArticle` — at minimum `title` and `snippet` are used; body text is `title + "\n\n" + snippet`, truncated to **12,000 characters**.

**With `OPENAI_API_KEY`:** Calls `generateText` with a clinician/policy-oriented prompt: 2–4 sentences, faithful to the excerpt, no invented studies or numbers.

**Without key:** Returns the snippet, whitespace-normalized, truncated to **560 characters** with an ellipsis if longer.

### `combineReportWithModel(topic: string, sources: SourceSummary[]): Promise<ResearchReport>`

Merges multiple per-source summaries into one `ResearchReport` with five sections.

**Input:**

- `topic` — user-facing search topic string.
- `sources` — each item must include `title`, `url`, and `summary` (plus other `ResearchArticle` fields).

**Empty `sources`:** Returns a fixed empty-state report (overview explains no sources; takeaway suggests broadening the topic). No API call.

**With `OPENAI_API_KEY`:** Builds a prompt from labeled sources (`### Source n`, URL, summary) and asks the model for **minified JSON** only, with keys:

`overview`, `recentDevelopments`, `benefits`, `risks`, `takeaway`

The implementation strips optional markdown code fences (```` ```json ````) then `JSON.parse`s the result. Each value is coerced with `String(...)` and missing keys become `""`.

**Parse / network failures:** If JSON parsing fails or any error is thrown in the try block, behavior falls through to the heuristic path (same as no key).

**Without key (or after failure):** Uses `heuristicReport`: stitches summaries into `overview`, and fills the other four fields with **static, domain-generic** paragraphs about AI in healthcare (not source-specific).

## Output shape (`ResearchReport`)

```ts
{
  overview: string;
  recentDevelopments: string;
  benefits: string;
  risks: string;
  takeaway: string;
}
```

Downstream code should treat all fields as **user-visible prose** (no assumed markdown).

## Operational notes

1. **Cost and latency** — Every successful LLM path is two round trips per research run (once per article, then once for the combined report). Workflow caps articles (`research-workflow.ts`); adjust there if you need different limits.
2. **Faithfulness** — Prompts explicitly discourage hallucination on the per-article step; the combined step is constrained to “themes present in these summaries.” Still review outputs for high-stakes use.
3. **Changing the model** — Replace `openai("gpt-4o-mini")` in both `generateText` calls. Ensure the model can follow the JSON-only instruction for `combineReportWithModel`.
4. **Testing without OpenAI** — Unset `OPENAI_API_KEY` to exercise truncation and heuristic report behavior locally.

## Related files

- `src/workflows/research-workflow.ts` — `summarizeSource` / `combineSummaries` call this module.
- `src/types/research.ts` — `ResearchArticle`, `SourceSummary`, `ResearchReport`, `ResearchResult`.
