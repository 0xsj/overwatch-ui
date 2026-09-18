import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import type { FormState } from "../_form-state";

/** The form-level half of a failure. The union makes this complementary to
 *  `errorFor` by construction: a state is `scope: "form"` or `scope: "fields"`,
 *  never both and never neither, so exactly one of the two renders. */
export function FormError({ state }: { state: FormState }) {
  if (state.status !== "error" || state.scope !== "form") return null;

  /* A RATE LIMIT is not the caller's mistake, and it is the one refusal where
     the obvious next move — check the password and try again — cannot work.
     Once the budget is spent a CORRECT password is refused too, deliberately:
     an attacker who guesses right on attempt eleven is still stopped. So this
     says wait, not check.

     Two keys guard it, the address and the IP, so a shared office NAT can lock
     colleagues out together — which is why the copy does not assume the reader
     is the one who was guessing. */
  const limited = state.kind === "rate_limited";
  return (
    <Alert tone={limited ? "warn" : "crit"}>
      <Text size="sm">{state.message}</Text>
      {limited ? (
        <Text size="xs" tone="tertiary">
          The right password will be refused too until this clears, so there is
          nothing to correct — one attempt comes back every thirty seconds. If
          you share an office network, somebody else&rsquo;s attempts may have
          spent it.
        </Text>
      ) : null}
    </Alert>
  );
}

/** No optional chain: on the `fields` arm the record is required. */
export const errorFor = (state: FormState, field: string) =>
  state.status === "error" && state.scope === "fields" ? state.fields[field] : undefined;
