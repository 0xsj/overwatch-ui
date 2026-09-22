"use client";

import { RouteState } from "../_components/route-state";

export default function Error({ reset }: { reset: () => void }) {
  return <RouteState homeHref="/home" kind="error" reset={reset} />;
}
