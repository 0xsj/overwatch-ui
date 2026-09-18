import type { Metadata } from "next";
import { CanvasScreen } from "./canvas-screen";

export const metadata: Metadata = { title: "Canvas" };

export default function Page() {
  return <CanvasScreen />;
}
