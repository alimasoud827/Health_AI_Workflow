import { getRun, start } from "workflow/api";
import { NextResponse } from "next/server";
import { researchWorkflow } from "@/workflows/research-workflow";
import type { ResearchResult } from "@/types/research";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic =
    typeof body === "object" && body !== null && "topic" in body
      ? String((body as { topic: unknown }).topic ?? "")
      : "";

  const run = await start(researchWorkflow, [topic]);

  return NextResponse.json({ runId: run.runId });
}

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const run = getRun<ResearchResult>(runId);

  if (!(await run.exists)) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const status = await run.status;

  if (status === "completed") {
    const result = await run.returnValue;
    return NextResponse.json({ status, result });
  }

  if (status === "failed" || status === "cancelled") {
    return NextResponse.json({
      status,
      error: status === "failed" ? "Workflow failed" : "Workflow cancelled",
    });
  }

  return NextResponse.json({ status });
}
