import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

/** Encabezado de las pantallas fuera del lector (biblioteca, subida, proceso). */
export function AppHeader({
  trail,
  signedIn,
}: {
  trail: { label: string; href?: string }[];
  signedIn: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-3 md:h-10 md:px-4">
      <nav aria-label="Ubicación" className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">
        {trail.map((t, i) => (
          <span key={i}>
            {i > 0 && <span className="px-1.5 opacity-60">/</span>}
            {t.href ? (
              <Link href={t.href} className="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60">
                {t.label}
              </Link>
            ) : (
              <span className="text-foreground/80">{t.label}</span>
            )}
          </span>
        ))}
      </nav>
      <ThemeToggle />
      {signedIn && (
        <form action={signOut}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex min-h-10 items-center gap-1.5 rounded-md px-2 font-sans text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 md:min-h-8"
          >
            <LogOut className="size-4 md:size-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      )}
    </header>
  );
}
