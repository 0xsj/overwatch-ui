import { Alert } from "@/components/display";
import { Text } from "@/components/typography";
import type { FormState } from "../_form-state";

/** The form-level half of a failure: a message the server returned that belongs
 *  to no single field. A message WITH a field is rendered by that Field instead,
 *  so exactly one of the two shows. */
export function FormError({ state }: { state: FormState }) {
  if (state.status !== "error" || state.field) return null;
  return (
    <Alert tone="crit">
      <Text size="sm">{state.message}</Text>
    </Alert>
  );
}

export const errorFor = (state: FormState, field: string) =>
  state.status === "error" && state.field === field ? state.message : undefined;
