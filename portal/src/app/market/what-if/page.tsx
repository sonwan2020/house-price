import type { Metadata } from "next";
import WhatIfView from "@/components/WhatIfView";

export const metadata: Metadata = {
  title: "What-if analysis · Property Value Estimator",
};

/** What-if analysis tool (App 2 frontend): scenarios predicted by the model. */
export default function WhatIfPage() {
  return <WhatIfView />;
}
