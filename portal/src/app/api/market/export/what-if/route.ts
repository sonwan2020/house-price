/**
 * POST /api/market/export/what-if?type=csv|pdf — server-side proxy to the
 * market analysis service. The body carries the saved what-if runs
 * (current run or history); the upstream renders them as CSV or PDF.
 * Streams the upstream file bytes with the upstream content type and
 * disposition, so the browser saves the attachment.
 */
import { NextResponse } from "next/server";
import { MARKET_API_URL } from "@/lib/api";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (type !== "csv" && type !== "pdf") {
    return NextResponse.json({ detail: "type must be 'csv' or 'pdf'." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ detail: "Request body must be a JSON object." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${MARKET_API_URL}/api/v1/market/export/what-if?type=${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "The market analysis service is unreachable. Please try again later." },
      { status: 502 },
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const disposition = upstream.headers.get("content-disposition");
  if (contentType) headers.set("Content-Type", contentType);
  if (disposition) headers.set("Content-Disposition", disposition);
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
