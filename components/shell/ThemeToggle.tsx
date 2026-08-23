"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "sepia" | "light";

const OPTIONS: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "Dark IDE", icon: Moon },
  { value: "sepia", label: "Sepia", icon: Sun },
  { value: "light", label: "Claro", icon: Monitor },
];

/** Aplica el tema fuera del ciclo de render (docs/08 D4). */
function applyTheme(next: Theme) {
  try {
    localStorage.setItem("nodos-theme", next);
  } catch {}
  document.documentElement.dataset.theme = next;
  document.documentElement.classList.toggle("dark", next === "dark");
}

function storedTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const t = localStorage.getItem("nodos-theme");
  return t === "sepia" || t === "light" || t === "dark" ? t : "dark";
}

/**
 * Selector de tema (docs/07 §4): persiste en localStorage, transición
 * suave y sin flash. Default: Dark IDE / Tokyo Night.
 */
export function ThemeToggle() {
  // Lazy init: el layout ya fijó data-theme antes del paint.
  const [theme, setTheme] = useState<Theme>(storedTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Tema visual"
      className="flex items-center gap-0.5 rounded-md border border-border p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          suppressHydrationWarning
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => {
            setTheme(value);
            applyTheme(value);
          }}
          className={cn(
            "rounded-sm px-2 py-1.5 text-muted-foreground",
            "focus-visible:outline-2 focus-visible:outline-ring/60",
            "md:px-1.5 md:py-1",
            theme === value && "bg-muted text-foreground"
          )}
        >
          <Icon className="size-4 md:size-3.5" />
        </button>
      ))}
    </div>
  );
}
