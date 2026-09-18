import type { Metadata } from "next";
import { BoardScreen } from "./board-screen";

export const metadata: Metadata = { title: "Findings" };

export default function Page() {
  return <BoardScreen />;
}
