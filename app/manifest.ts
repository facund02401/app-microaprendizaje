import type { MetadataRoute } from "next";

/** Permite "Agregar a pantalla de inicio": se abre como app, sin barras del navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nodos — Lector de micro-dosis",
    short_name: "Nodos",
    description: "Textos teóricos densos, intactos, en dosis de 5 a 10 minutos.",
    lang: "es",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1e1e2e",
    theme_color: "#181825",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
