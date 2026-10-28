/**
 * GET /api/health — liveness probe for the portal itself (used by the
 * Docker HEALTHCHECK). Reports whether the Python API is reachable too,
 * but the portal stays "ok" when it is not, so the UI can still render
 * its own error states.
 */
import { NextResponse } from "next/server";
import { PYTHON_API_URL } from "@/lib/api";

export async function GET() {
  let api: "ok" | "unhealthy" | "unreachable" = "unreachable";
  try {
    const upstream = await fetch(`${PYTHON_API_URL}/api/health`, { cache: "no-store" });
    api = upstream.ok ? "ok" : "unhealthy";
  } catch {
    // leave "unreachable"
  }
  return NextResponse.json({ status: "ok", api });
}
