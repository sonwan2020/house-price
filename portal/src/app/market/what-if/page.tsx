import type { Metadata } from "next";
import { Suspense } from "react";
import ModelCoefficients from "@/components/ModelCoefficients";
import WhatIfView from "@/components/WhatIfView";

export const metadata: Metadata = {
  title: "What-if analysis · Property Value Estimator",
};

/**
 * What-if analysis tool (App 2 frontend): scenarios predicted by the model.
 * Dynamic like the Model page — the coefficient card depends on the
 * external prediction service.
 */
export const dynamic = "force-dynamic";

export default function WhatIfPage() {
  return (
    <WhatIfView
      context={
        <Suspense
          fallback={<p className="text-sm text-ink-muted">Loading model coefficients…</p>}
        >
          <ModelCoefficients />
        </Suspense>
      }
    />
  );
}
