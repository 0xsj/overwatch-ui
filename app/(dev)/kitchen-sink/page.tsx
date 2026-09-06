import { SECTIONS } from "./_sections/registry";

export default function KitchenSinkPage() {
  return (
    <>
      {SECTIONS.map(({ id, Section }) => <Section key={id} />)}
    </>
  );
}
