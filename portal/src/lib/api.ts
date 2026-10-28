/**
 * Server-only helpers for talking to the Python prediction service.
 * Only server components and route handlers import this module — the
 * browser never calls the Python API directly.
 *
 * `server-only` makes that a build-time guarantee: importing this module
 * from a client component fails the production build (and `PYTHON_API_URL`
 * can never leak into the browser bundle).
 */
import "server-only";
import type { ModelInfo } from "./types";

/**
 * Base URL of the Python API.
 * Docker Compose sets http://api:8000 (internal network); local dev
 * defaults to the service running on the host. See .env.example.
 */
export const PYTHON_API_URL = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

/**
 * Fetch model info for server components. Model info changes only when a
 * new model is trained, so revalidate every minute instead of no-store.
 */
export async function fetchModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${PYTHON_API_URL}/api/v1/model-info`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`model-info request failed with status ${res.status}`);
  }
  return res.json() as Promise<ModelInfo>;
}
