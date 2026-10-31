/**
 * POST /api/market/what-if — server-side proxy to the market analysis
 * service. The upstream validates baseline and scenarios in detail.
 */
import { NextResponse } from "next/server";
import { proxyMarketJson } from "@/lib/market-proxy";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ detail: "Request body must be a JSON object." }, { status: 400 });
  }

  return proxyMarketJson("/api/v1/market/what-if", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
