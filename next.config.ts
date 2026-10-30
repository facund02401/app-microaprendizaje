import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La exportación a PDF lee las fuentes del disco: hay que incluirlas en el servidor.
  outputFileTracingIncludes: {
    "/api/documents/*/export": ["./lib/export/fonts/**/*"],
    "/api/documents/\\[id\\]/export": ["./lib/export/fonts/**/*"],
    // El corrector ortográfico lee el diccionario de español del disco.
    "/api/documents/*/step": ["./node_modules/dictionary-es/index.{aff,dic}"],
    "/api/documents/\\[id\\]/step": ["./node_modules/dictionary-es/index.{aff,dic}"],
  },
};

export default nextConfig;
