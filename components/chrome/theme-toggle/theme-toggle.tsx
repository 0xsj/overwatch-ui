"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/forms";
import { cn } from "@/lib/kernel";
import s from "./theme-toggle.module.css";

const OPTIONS = [
  { value: "system", label: "Match the system", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

type Choice = (typeof OPTIONS)[number]["value"];

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Choice {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "system";
}

function getServerSnapshot(): Choice {
  return "system";
}

function apply(next: Choice) {
  const el = document.documentElement;
  if (next === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", next);
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div role="group" aria-label="Theme" className={cn(s.group, className)}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <Button
          key={value}
          size="icon"
          intent={choice === value ? "secondary" : "ghost"}
          aria-label={label}
          aria-pressed={choice === value}
          onClick={() => apply(value)}
        >
          <Icon size={14} />
        </Button>
      ))}
    </div>
  );
}
