import type { ComponentType } from "react";
import { DisplaySection } from "./display";
import { FormsSection } from "./forms";
import { TokensSection } from "./tokens";
import { TypographySection } from "./typography";

export type Entry = { id: string; label: string; Section: ComponentType };

export const SECTIONS: readonly Entry[] = [
  { id: "tokens", label: "Tokens", Section: TokensSection },
  { id: "typography", label: "Typography", Section: TypographySection },
  { id: "forms", label: "Forms", Section: FormsSection },
  { id: "display", label: "Display", Section: DisplaySection },
];
