import { fetchModelInfo } from "@/lib/api";
import ModelInfoCard from "./ModelInfoCard";

/**
 * Server component that fetches model info for the Model page. Rendered
 * inside a Suspense boundary (see app/model/page.tsx) so the page paints
 * immediately and the model tiles stream in when the API answers.
 */
export default async function ModelInfoPanel() {
  const modelInfo = await fetchModelInfo().catch(() => null);
  return <ModelInfoCard modelInfo={modelInfo} />;
}
