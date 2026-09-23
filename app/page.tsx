import Link from "next/link";

export default function Landing() {
  return (
    <main className="bg-editor flex-1 flex items-center justify-center px-6">
      <div className="max-w-[60ch] text-center">
        <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
          e-reader de micro-dosis
        </p>
        <h1 className="font-serif text-[44px] leading-tight font-bold mb-5">
          Nodos
        </h1>
        <p className="font-serif text-[19px] leading-[1.8] text-muted-foreground mb-10">
          Textos teóricos densos, intactos, en dosis de 5 a 10 minutos.
          Sin culpa, sin rachas: andamiaje hacia la lectura completa.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-md bg-primary px-5 py-2.5 font-sans text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-ring/60"
        >
          Entrar a la biblioteca →
        </Link>
        <p className="mt-16 font-mono text-[11px] text-muted-foreground/70">
          Fase 2 · tus textos, guardados en tu cuenta
        </p>
      </div>
    </main>
  );
}
