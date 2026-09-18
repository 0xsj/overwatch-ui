import { QueryClient } from "@tanstack/react-query";

/** One client per browser tab, and the defaults are the whole of the policy.
 *
 *  Everything below is a decision rather than a copied snippet, because a query
 *  cache is a second source of truth about a client's data and the settings are
 *  where it either agrees with the server or quietly does not. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /** Sixty seconds, not zero and not Infinity.
         *
         *  Zero refetches on every mount, which turns a tab switch into a burst
         *  of requests against an API that spawns processes. Infinity means a
         *  run that finished still reads `running` until a reload — which is
         *  the bug this library was brought in to fix, so making it the default
         *  would be perverse. */
        staleTime: 60_000,

        /** ONE retry, and never on a refusal.
         *
         *  A 403 and a 404 are ANSWERS here — `none` on a grant means an
         *  engagement is not visible, and a refused spawn is the scope gate
         *  working. Retrying either is asking the same question again and
         *  hoping for a different answer, and it turns one wall into three. */
        retry: (attempt, error) =>
          attempt < 1 && !isAnswer(error),

        /** Refetch when the tab comes back, because the interesting data here
         *  changes without this client doing anything — a schedule starts runs
         *  and a subscriber writes fragments a delivery later. */
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // A write is never retried automatically. Starting a run twice spawns
        // two sets of processes against a client's estate.
        retry: false,
      },
    },
  });
}

/** A refusal is an answer, and an answer is not worth retrying.
 *
 *  Read off the shared envelope rather than a status code, because nothing
 *  above `lib/http` is allowed to name one — that is the seam's rule and it
 *  holds here too. */
function isAnswer(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status !== undefined && status >= 400 && status < 500;
}
