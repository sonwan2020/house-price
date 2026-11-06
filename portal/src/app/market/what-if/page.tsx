import type { Metadata } from "next";
import WhatIfView from "@/components/WhatIfView";
import { baselineFromParams } from "@/lib/validation";

export const metadata: Metadata = {
  title: "What-if analysis · Property Value Estimator",
};

/**
 * What-if analysis tool (App 2 frontend): scenarios predicted by the model.
 * Dynamic because a run hits the external services per request.
 *
 * A listing selected on the market page arrives as ?square_footage=… search
 * params; valid ones seed the baseline form (invalid ones fall back to the
 * defaults).
 */
export const dynamic = "force-dynamic";

export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialBaseline = baselineFromParams(await searchParams);
  return <WhatIfView initialBaseline={initialBaseline} />;
}
