import { fetchModelInfo } from "@/lib/api";
import ModelInfoCard from "./ModelInfoCard";

/**
 * Server component that fetches model info for the home page. Rendered
 * inside a Suspense boundary (see app/page.tsx) so the estimator form
 * paints immediately and the model tiles stream in when the API answers.
 */
export default async function ModelInfoPanel() {
  const modelInfo = await fetchModelInfo().catch(() => null);
  return <ModelInfoCard modelInfo={modelInfo} />;
}
