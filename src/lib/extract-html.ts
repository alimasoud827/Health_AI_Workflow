import * as cheerio from "cheerio";
import type { ResearchArticle } from "@/types/research";

export function extractReadableContent(url: string, html: string): ResearchArticle {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "Untitled";

  const desc =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  $("script, style, nav, footer, noscript, svg").remove();

  let mainText = $("main, article").first().text();
  if (!mainText || mainText.length < 80) {
    mainText = $("body").text();
  }

  const text = mainText.replace(/\s+/g, " ").trim();

  const snippet = [desc, text.slice(0, 7000)].filter(Boolean).join("\n\n").trim();

  const date =
    $('meta[property="article:published_time"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    undefined;

  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    hostname = "unknown";
  }

  return {
    url,
    title: title.slice(0, 400),
    source: hostname,
    date: date?.slice(0, 64),
    snippet: snippet.slice(0, 12_000),
  };
}
