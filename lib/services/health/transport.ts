export type BackendTransport =
  | { status: "fixtures" }
  | { status: "ok"; url: string; ms: number }
  | { status: "unreachable"; url: string; reason: string }
  | { status: "unhealthy"; url: string; code: number };

function healthUrl(baseUrl: string): string {
  return new URL("/healthz", baseUrl).toString();
}

/** A browser-safe process probe. It deliberately knows nothing about the
 * server session or adapter selection; it only answers whether `/healthz`
 * responded, while the workspace report answers whether machinery is well. */
export async function checkBackend(timeoutMs = 1500): Promise<BackendTransport> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return { status: "fixtures" };
  const url = healthUrl(baseUrl);
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!response.ok) return { status: "unhealthy", url, code: response.status };
    return { status: "ok", url, ms: Date.now() - started };
  } catch (error) {
    return { status: "unreachable", url, reason: error instanceof Error ? error.message : String(error) };
  }
}
