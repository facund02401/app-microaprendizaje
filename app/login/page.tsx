import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Ingresar — Nodos" };

interface Props {
  searchParams: Promise<{ confirmado?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { confirmado } = await searchParams;

  return (
    <main className="bg-editor flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px]">
        <p className="mb-3 text-center font-mono text-[12px] tracking-[0.2em] text-muted-foreground uppercase">
          e-reader de micro-dosis
        </p>
        <h1 className="mb-8 text-center font-serif text-[38px] leading-tight font-bold">
          Nodos
        </h1>
        <LoginForm confirmed={confirmado === "1"} />
      </div>
    </main>
  );
}
