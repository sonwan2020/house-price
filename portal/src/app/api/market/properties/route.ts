/**
 * GET /api/market/properties — server-side proxy to the market analysis
 * service. Filters, sorting and paging params pass through unchanged.
 */
import { proxyMarketJson } from "@/lib/market-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyMarketJson(`/api/market/properties${query ? `?${query}` : ""}`);
}
