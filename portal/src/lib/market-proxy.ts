/**
 * Server-only helper for proxying to the Java market analysis service.
 * Only route handlers import this module — the browser never talks to
 * the market API directly (mirrors the pattern in lib/api.ts).
 */
import "server-only";
import { NextResponse } from "next/server";
import { MARKET_API_URL } from "./api";

/** Proxy a JSON market-api endpoint, passing status and body through unchanged. */
export async function proxyMarketJson(path: string, init?: RequestInit) {
  try {
    const upstream = await fetch(`${MARKET_API_URL}${path}`, { cache: "no-store", ...init });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json(
      { detail: "The market analysis service is unreachable. Please try again later." },
      { status: 502 },
    );
  }
}
