import { adapterFor, DOMAINS } from "./index";

export type Health =
  | { status: "fixtures" }
  | { status: "ok"; url: string; ms: number }
  | { status: "unreachable"; url: string; reason: string }
  | { status: "unhealthy"; url: string; code: number };

/** `/healthz` is NOT under `/v1` — the server mounts it at the root, beside
 *  `/readyz`. A leading slash in `new URL` discards the base's path, which is
 *  what makes one base URL serve both. */
export function healthUrl(baseUrl: string): string {
  return new URL("/healthz", baseUrl).toString();
}

/** One probe, at startup, with a short deadline. It reports; it never decides.
 *  A failed probe does NOT fall back to fixtures — the adapter was chosen from
 *  configuration and stays chosen, so an unreachable server produces errors on
 *  screen rather than silently-fake data. That is the whole reason to say so
 *  loudly at boot. */
export async function checkBackend(timeoutMs = 1500): Promise<Health> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return { status: "fixtures" };

  const url = healthUrl(baseUrl);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return { status: "unhealthy", url, code: response.status };
    return { status: "ok", url, ms: Date.now() - started };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: "unreachable", url, reason };
  }
}

/** One line per domain. A backend built slice by slice means the interesting
 *  fact at boot is not "is there a server" but WHICH PARTS of the client are
 *  talking to it — and that is invisible everywhere else. */
function domainLines(): string[] {
  return DOMAINS.map((d) => {
    const adapter = adapterFor(d);
    const why = adapter === "fetch" ? "served" : "no endpoint yet — fixtures";
    return `  ${d.padEnd(8)} ${adapter.padEnd(7)}${why}`;
  });
}

/** The startup banner. A block rather than a line, because the thing somebody
 *  needs at 07:26 is which adapter is live and whether it answered. */
export function describeHealth(health: Health): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const lines = ["overwatch-ui · transport"];

  switch (health.status) {
    case "fixtures":
      lines.push("  adapter  memory — NEXT_PUBLIC_API_URL is not set");
      lines.push("  health   not checked, there is nothing to check");
      lines.push("  effect   every screen runs on fixtures and says so with a mock badge");
      break;
    case "ok":
      lines.push(`  base     ${base}`);
      lines.push(`  health   ok in ${health.ms}ms — ${health.url}`);
      lines.push(...domainLines());
      break;
    case "unhealthy":
      lines.push(`  base     ${base}`);
      lines.push(`  health   ANSWERED ${health.code} — ${health.url}`);
      lines.push("  effect   requests will reach it and may still fail");
      lines.push(...domainLines());
      break;
    case "unreachable":
      lines.push(`  base     ${base}`);
      lines.push(`  health   UNREACHABLE — ${health.reason}`);
      lines.push("  effect   there is NO fallback to fixtures. Every request fails and");
      lines.push("           the screens show the error, which is the honest outcome");
      lines.push(...domainLines());
      break;
    default: {
      const never: never = health;
      return never;
    }
  }
  return lines.join("\n");
}
