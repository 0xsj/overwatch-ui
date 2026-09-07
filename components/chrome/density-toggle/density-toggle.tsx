"use client";

import { Toggle } from "@/components/forms";
import { cn } from "@/lib/kernel";
import { setDensity, useDensity, type Density } from "@/lib/runtime";
import s from "./density-toggle.module.css";

const OPTIONS: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export function DensityToggle({ className }: { className?: string }) {
  const density = useDensity();

  return (
    <div role="group" aria-label="Density" className={cn(s.group, className)}>
      {OPTIONS.map(({ value, label }) => (
        <Toggle
          key={value}
          size="sm"
          pressed={density === value}
          onPressedChange={() => setDensity(value)}
        >
          {label}
        </Toggle>
      ))}
    </div>
  );
}
