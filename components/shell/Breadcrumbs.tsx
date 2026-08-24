import { cn } from "@/lib/utils";

interface Props {
  items: string[];
  className?: string;
}

/** Migas de pan superiores (docs/07 §1.4): genealogía del texto. */
export function Breadcrumbs({ items, className }: Props) {
  return (
    <nav aria-label="Ubicación" className={cn("font-mono text-[12px] truncate", className)}>
      <ol className="flex items-center gap-1.5 text-muted-foreground min-w-0">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center gap-1.5 min-w-0",
              // En pantallas angostas solo quedan los dos niveles finales:
              // capítulo › nodo (los superiores son contexto redundante).
              i < items.length - 2 && "hidden sm:flex"
            )}
          >
            {i > 0 && <span aria-hidden="true" className="opacity-50">›</span>}
            <span
              className={cn(
                "truncate",
                i === items.length - 1 && "text-foreground"
              )}
            >
              {item}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
