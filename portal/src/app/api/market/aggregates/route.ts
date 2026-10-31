/**
 * GET /api/market/aggregates — server-side proxy to the market analysis
 * service. Query params (segment filters) pass through unchanged.
 */
import { proxyMarketJson } from "@/lib/market-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyMarketJson(`/api/v1/market/aggregates${query ? `?${query}` : ""}`);
}
