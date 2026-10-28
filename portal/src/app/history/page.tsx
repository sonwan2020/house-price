import type { Metadata } from "next";
import HistoryView from "@/components/HistoryView";

export const metadata: Metadata = {
  title: "Estimate history · Property Value Estimator",
};

export default function HistoryPage() {
  return <HistoryView />;
}
