import { Panel } from "@/components/display";
import { Text } from "@/components/typography";
import s from "./owed.module.css";

/** A flow whose MODEL exists and whose COMMAND does not.
 *
 *  Distinct from `Unbuilt`, and the distinction is the useful part. `Unbuilt`
 *  means nothing on the screen reads a service and no number has been measured.
 *  This means the type, the column and the storage method are all there and
 *  nobody calls them — which is a much cheaper gap, and a different thing for a
 *  reader to know.
 *
 *  It is a Panel rather than an Alert because it is not a warning. Nothing has
 *  gone wrong; this is the shape of the screen with one piece missing, and
 *  drawing it as an error trains people to ignore errors. */
export function Owed({ title, note }: { title: string; note: string }) {
  return (
    <Panel title={title} className={s.owed}>
      <Text size="sm" tone="tertiary">{note}</Text>
    </Panel>
  );
}
