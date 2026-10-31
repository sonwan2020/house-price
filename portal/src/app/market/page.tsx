import type { Metadata } from "next";
import MarketDashboardView from "@/components/MarketDashboardView";
import { fetchMarketInitial } from "@/lib/market-proxy";
import type { MarketInitialData } from "@/lib/market";

export const metadata: Metadata = {
  title: "Property market · Property Value Estimator",
};

/**
 * Market analysis dashboard (App 2 frontend): filters, charts, table, exports.
 * The unfiltered aggregates and the first table page are fetched by this
 * server component (RSC initial data loading), so the first paint has data;
 * filter/sort/page changes fetch client-side through the proxy routes.
 * Dynamic because the data comes from the market service per request.
 */
export const dynamic = "force-dynamic";

export default async function MarketPage() {
  let initial: MarketInitialData | null = null;
  try {
    initial = await fetchMarketInitial();
  } catch {
    // Market service unavailable at render time: hand over to the client
    // view, which fetches on mount and shows its own inline error states.
  }
  return <MarketDashboardView initialData={initial} />;
}
