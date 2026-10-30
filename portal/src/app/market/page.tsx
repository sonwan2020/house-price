import type { Metadata } from "next";
import MarketDashboardView from "@/components/MarketDashboardView";

export const metadata: Metadata = {
  title: "Property market · Property Value Estimator",
};

/** Market analysis dashboard (App 2 frontend): filters, charts, table, exports. */
export default function MarketPage() {
  return <MarketDashboardView />;
}
