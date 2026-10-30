/**
 * GET /api/market/export?format=csv|pdf — server-side proxy to the market
 * analysis service. Streams the upstream file bytes with the upstream
 * content type and disposition, so the browser saves the attachment.
 */
import { NextResponse } from "next/server";
import { MARKET_API_URL } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json(
      { detail: "format must be 'csv' or 'pdf'." },
      { status: 400 },
    );
  }
  searchParams.delete("format");
  const query = searchParams.toString();

  let upstream: Response;
  try {
    upstream = await fetch(
      `${MARKET_API_URL}/api/market/export.${format}${query ? `?${query}` : ""}`,
      { cache: "no-store" },
    );
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
