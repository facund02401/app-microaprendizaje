import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La exportación a PDF lee las fuentes del disco: hay que incluirlas en el servidor.
  outputFileTracingIncludes: {
    "/api/documents/*/export": ["./lib/export/fonts/**/*"],
    "/api/documents/\\[id\\]/export": ["./lib/export/fonts/**/*"],
  },
};

export default nextConfig;
