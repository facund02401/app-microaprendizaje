import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Subir documento — Nodos" };

export default async function UploadPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        trail={[{ label: "Biblioteca", href: "/dashboard" }, { label: "Subir documento" }]}
        signedIn
      />
      <main className="bg-editor flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[60ch]">
          <h1 className="mb-3 font-serif text-[28px] font-bold">Subir documento</h1>
          <p className="mb-8 font-sans text-[14.5px] leading-relaxed text-muted-foreground">
            Primero leemos el archivo (gratis) y te mostramos cuánto costaría procesarlo con IA.
            Nada se procesa hasta que lo confirmes.
          </p>
          <UploadDropzone userId={user.id} />
        </div>
      </main>
    </div>
  );
}
