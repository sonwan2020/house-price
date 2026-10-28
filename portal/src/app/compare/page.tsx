import type { Metadata } from "next";
import CompareView from "@/components/CompareView";

export const metadata: Metadata = {
  title: "Compare properties · Property Value Estimator",
};

export default function ComparePage() {
  return <CompareView />;
}
