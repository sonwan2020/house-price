import type { Metadata } from "next";
import { Suspense } from "react";
import ModelCoefficients from "@/components/ModelCoefficients";
import ModelInfoPanel from "@/components/ModelInfoPanel";
import ModelInfoSkeleton from "@/components/ModelInfoSkeleton";

export const metadata: Metadata = {
  title: "Model · Property Value Estimator",
};

/**
 * Model: a React Server Component renders the page shell, and model info
 * loads inside a Suspense boundary so the page paints immediately while
 * the model tiles stream in from the API. Dynamic (not prerendered)
 * because model info depends on an external service's availability and
 * changes per deployment.
 */
export const dynamic = "force-dynamic";

export default function ModelPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Model</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The regression model currently serving the prediction API, with its cross-validated
          training metrics and per-feature coefficients.
        </p>
      </header>
      <Suspense fallback={<ModelInfoSkeleton />}>
        <ModelInfoPanel />
        <div className="mt-4">
          <ModelCoefficients />
        </div>
      </Suspense>
    </div>
  );
}
