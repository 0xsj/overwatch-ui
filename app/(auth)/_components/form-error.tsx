import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import type { FormState } from "../_form-state";

/** The form-level half of a failure. The union makes this complementary to
 *  `errorFor` by construction: a state is `scope: "form"` or `scope: "fields"`,
 *  never both and never neither, so exactly one of the two renders. */
export function FormError({ state }: { state: FormState }) {
  if (state.status !== "error" || state.scope !== "form") return null;
  return (
    <Alert tone="crit">
      <Text size="sm">{state.message}</Text>
    </Alert>
  );
}

/** No optional chain: on the `fields` arm the record is required. */
export const errorFor = (state: FormState, field: string) =>
  state.status === "error" && state.scope === "fields" ? state.fields[field] : undefined;
