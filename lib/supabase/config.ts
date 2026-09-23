export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Sin variables de Supabase la app funciona solo con el texto de prueba. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const DOCUMENTS_BUCKET = "documents";
