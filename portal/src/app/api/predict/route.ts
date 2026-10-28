/**
 * POST /api/predict — server-side proxy to the Python prediction service.
 * The browser only talks to the portal; the Python API is never exposed
 * to clients (no CORS needed).
 */
import { NextResponse } from "next/server";
import { PYTHON_API_URL } from "@/lib/api";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { detail: "Request body must be a JSON array of properties." },
      { status: 422 },
    );
  }

  try {
    const upstream = await fetch(`${PYTHON_API_URL}/api/v1/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    // Pass through status (200/207/400/422) and body unchanged.
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json(
      { detail: "The prediction service is unreachable. Please try again later." },
      { status: 502 },
    );
  }
}
