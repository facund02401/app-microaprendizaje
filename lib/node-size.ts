/**
 * Tamaño de nodo preferido por el usuario (se guarda en su cuenta:
 * `user_metadata.node_size` de Supabase Auth). "short" es el default del
 * producto (docs/02: 300–600 palabras); los otros dos son opción del dueño.
 */
export type NodeSize = "short" | "medium" | "long";

export const DEFAULT_NODE_SIZE: NodeSize = "short";

export const NODE_SIZES: Record<
  NodeSize,
  { label: string; range: string; target: string; tooShort: number; minutes: string }
> = {
  short: { label: "Cortos", range: "300–600", target: "300–600", tooShort: 200, minutes: "5–8" },
  medium: { label: "Medios", range: "600–1000", target: "600–1000", tooShort: 400, minutes: "8–13" },
  long: { label: "Largos", range: "1000–1500", target: "1000–1500", tooShort: 700, minutes: "13–19" },
};

export function parseNodeSize(v: unknown): NodeSize {
  return v === "medium" || v === "long" || v === "short" ? v : DEFAULT_NODE_SIZE;
}
