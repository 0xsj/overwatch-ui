import Link from "next/link";
import { Button } from "@/components/forms";
import s from "./route-state.module.css";

type RouteStateKind = "error" | "loading" | "not-found";

const COPY: Record<RouteStateKind, { detail: string; kicker: string; title: string }> = {
  error: {
    detail: "The failure is limited to this view. Try again, or return to the application without changing any saved evidence.",
    kicker: "Route error",
    title: "This view could not be loaded",
  },
  loading: {
    detail: "Overwatch is restoring persisted state. Nothing is inferred while the view is unavailable.",
    kicker: "Working",
    title: "Restoring your view",
  },
  "not-found": {
    detail: "The link may be stale, or this workspace may no longer grant access to it. No restricted content was exposed.",
    kicker: "Not found",
    title: "That view is not available",
  },
};

export function RouteState({
  homeHref,
  kind,
  reset,
}: {
  homeHref: string;
  kind: RouteStateKind;
  reset?: () => void;
}) {
  const copy = COPY[kind];
  const loading = kind === "loading";

  return (
    <div className={s.page} data-kind={kind} role={loading ? "status" : undefined} aria-live={loading ? "polite" : undefined}>
      <div className={s.glow} aria-hidden="true" />
      <section className={s.card} aria-labelledby="route-state-title">
        <span className={s.kicker}>{copy.kicker}</span>
        <h1 id="route-state-title" className={s.title}>{copy.title}</h1>
        <p className={s.detail}>{copy.detail}</p>
        {loading ? (
          <div className={s.skeleton} aria-label="Loading">
            <span /><span /><span />
          </div>
        ) : (
          <div className={s.actions}>
            {kind === "error" && reset ? <Button intent="primary" onClick={reset}>Try again</Button> : null}
            <Button asChild intent={kind === "error" ? "ghost" : "primary"}>
              <Link href={homeHref}>{homeHref === "/" ? "Return to Overwatch" : "Open the application"}</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
