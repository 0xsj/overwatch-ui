import type { ComponentType } from "react";
import { DisplaySection } from "./display";
import { LayoutSection } from "./layout";
import { FormsSection } from "./forms";
import { NavigationSection } from "./navigation";
import { OverlaysSection } from "./overlays";
import { TokensSection } from "./tokens";
import { TypographySection } from "./typography";
import { UtilitySection } from "./utility";

export type Entry = { id: string; label: string; Section: ComponentType };

export const SECTIONS: readonly Entry[] = [
  { id: "tokens", label: "Tokens", Section: TokensSection },
  { id: "typography", label: "Typography", Section: TypographySection },
  { id: "forms", label: "Forms", Section: FormsSection },
  { id: "display", label: "Display", Section: DisplaySection },
  { id: "layout", label: "Layout", Section: LayoutSection },
  { id: "navigation", label: "Navigation", Section: NavigationSection },
  { id: "overlays", label: "Overlays", Section: OverlaysSection },
  { id: "utility", label: "Utility", Section: UtilitySection },
];
