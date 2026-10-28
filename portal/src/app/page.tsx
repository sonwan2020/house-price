import { Suspense } from "react";
import EstimatorView from "@/components/EstimatorView";
import ModelInfoPanel from "@/components/ModelInfoPanel";
import ModelInfoSkeleton from "@/components/ModelInfoSkeleton";

/**
 * Home: a React Server Component renders the page shell, and model info
 * loads inside a Suspense boundary so the estimator form paints
 * immediately while the model tiles stream in from the API. Dynamic
 * (not prerendered) because model info depends on an external service's
 * availability and changes per deployment.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ModelInfoSkeleton />}>
        <ModelInfoPanel />
      </Suspense>
      <EstimatorView />
    </div>
  );
}
