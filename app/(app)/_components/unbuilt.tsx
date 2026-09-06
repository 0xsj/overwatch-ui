import { Alert } from "@/components/display";
import { Text } from "@/components/typography";

export function Unbuilt() {
  return (
    <Alert tone="info" live={false}>
      <Text size="sm">
        Not built. The heading and the paragraph above come from the design reference;
        nothing on this screen reads a service, and no number here has been measured.
      </Text>
    </Alert>
  );
}
