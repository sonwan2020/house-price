/**
 * Server-only helper for proxying to the Java market analysis service.
 * Only route handlers import this module — the browser never talks to
 * the market API directly (mirrors the pattern in lib/api.ts).
 */
import "server-only";
import { NextResponse } from "next/server";
import { MARKET_API_URL } from "./api";
import type { AggregatesResponse, MarketInitialData, PropertiesPage } from "./market";

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

/**
 * Server-side fetch of the dashboard's initial data (RSC initial data
 * loading): unfiltered aggregates plus the first page of the default
 * table sort. The property URL must match the query string
 * MarketDashboardView computes on first render so the client can skip
 * re-fetching the data it already received. Throws when the market
 * service is unavailable — the page catches it and lets the client view
 * fetch on its own with its inline error states.
 */
export async function fetchMarketInitial(): Promise<MarketInitialData> {
  const [aggregatesRes, propertiesRes] = await Promise.all([
    fetch(`${MARKET_API_URL}/api/market/aggregates`, { cache: "no-store" }),
    fetch(`${MARKET_API_URL}/api/market/properties?sortBy=price&sortDir=desc&page=0&size=25`, {
      cache: "no-store",
    }),
  ]);
  if (!aggregatesRes.ok || !propertiesRes.ok) {
    throw new Error(
      `market-api initial fetch failed: aggregates=${aggregatesRes.status} properties=${propertiesRes.status}`,
    );
  }
  return {
    aggregates: (await aggregatesRes.json()) as AggregatesResponse,
    properties: (await propertiesRes.json()) as PropertiesPage,
  };
}
