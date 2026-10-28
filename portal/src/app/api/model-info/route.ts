/**
 * GET /api/model-info — server-side proxy with short-lived caching.
 */
import { NextResponse } from "next/server";
import { PYTHON_API_URL } from "@/lib/api";

export async function GET() {
  try {
    const upstream = await fetch(`${PYTHON_API_URL}/api/v1/model-info`, {
      next: { revalidate: 60 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { detail: "Model information is unavailable." },
        { status: upstream.status },
      );
    }
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(
      { detail: "The prediction service is unreachable." },
      { status: 502 },
    );
  }
}
