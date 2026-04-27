"use client";

import { useCallback, useState } from "react";
import type { ResearchResult } from "@/types/research";

const STATUS_MESSAGES = [
  "Finding sources…",
  "Reading articles…",
  "Summarizing…",
  "Building report…",
] as const;

function statusFromElapsed(ms: number): string {
  const idx = Math.min(
    STATUS_MESSAGES.length - 1,
    Math.floor(ms / 4500)
  );
  return STATUS_MESSAGES[idx];
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runResearch = useCallback(async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    const started = Date.now();
    const tick = window.setInterval(() => {
      setStatusLine(statusFromElapsed(Date.now() - started));
    }, 400);

    try {
      setStatusLine(STATUS_MESSAGES[0]);
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        throw new Error("Could not start research run.");
      }

      const { runId } = (await res.json()) as { runId: string };

      let data: {
        status: string;
        result?: ResearchResult;
        error?: string;
      };

      for (;;) {
        const poll = await fetch(`/api/research?runId=${encodeURIComponent(runId)}`);
        data = (await poll.json()) as typeof data;

        if (data.status === "completed" && data.result) {
          setResult(data.result);
          break;
        }
        if (data.status === "failed" || data.status === "cancelled") {
          throw new Error(data.error ?? "Research run did not complete.");
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      window.clearInterval(tick);
      setLoading(false);
      setStatusLine("");
    }
  }, [topic]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            Hackathon demo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            AI Health Research Agent
          </h1>
          <p className="max-w-2xl text-zinc-600">
            Durable workflow that gathers allowlisted WHO, CDC, NIH, PubMed,
            and related pages, then summarizes them into a short structured
            brief. No news APIs — only trusted health domains and NIH search
            utilities.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label htmlFor="topic" className="mb-2 block text-sm font-medium text-zinc-700">
            Research topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. AI in healthcare, medical AI safety"
            className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none ring-teal-600/0 transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => void runResearch()}
            disabled={loading || !topic.trim()}
            className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Research
          </button>

          {loading ? (
            <p className="mt-4 text-sm text-teal-800" aria-live="polite">
              {statusLine}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        {result ? (
          <section className="space-y-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Report — {result.topic || "Your topic"}
              </h2>
              <ReportBody report={result.report} />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Sources</h2>
              <ul className="space-y-4">
                {result.sources.map((s) => (
                  <li key={s.url} className="border-b border-zinc-100 pb-4 last:border-0">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-800 underline-offset-2 hover:underline"
                    >
                      {s.title}
                    </a>
                    <p className="mt-1 text-xs text-zinc-500">
                      {s.source}
                      {s.date ? ` · ${s.date}` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700">{s.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ReportBody({
  report,
}: {
  report: ResearchResult["report"];
}) {
  const sections: { title: string; body: string }[] = [
    { title: "Overview", body: report.overview },
    { title: "Recent developments", body: report.recentDevelopments },
    { title: "Benefits", body: report.benefits },
    { title: "Risks / ethical concerns", body: report.risks },
    { title: "Final takeaway", body: report.takeaway },
  ];

  return (
    <div className="space-y-6">
      {sections.map((s) =>
        s.body ? (
          <div key={s.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {s.title}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {s.body}
            </p>
          </div>
        ) : null
      )}
    </div>
  );
}
