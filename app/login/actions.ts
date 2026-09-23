"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  message?: string;
  tone?: "info" | "error";
}

const EMAIL_SETUP =
  "Supabase no pudo enviar el email de confirmación. Solución: en Supabase desactivá \"Confirm email\" (guía docs/09, paso 1) y volvé a tocar \"Crear mi cuenta\".";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  email_not_confirmed:
    "Falta confirmar tu email: buscá el correo de Supabase (revisá también spam) y tocá el enlace.",
  user_already_exists: "Ese email ya tiene cuenta: ingresá con tu contraseña.",
  weak_password: "La contraseña es muy corta: usá al menos 8 caracteres.",
  over_email_send_rate_limit:
    "Se enviaron varios emails seguidos. Esperá unos minutos y probá de nuevo.",
  email_address_not_authorized: EMAIL_SETUP,
};

const NOT_ALLOWED = "Este email no está habilitado para usar Nodos.";

function readForm(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readForm(formData);
  if (!email || !password) {
    return { tone: "error", message: "Completá email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      tone: "error",
      message: MESSAGES[error.code ?? ""] ?? "No se pudo ingresar. Probá de nuevo.",
    };
  }
  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readForm(formData);
  if (!email || password.length < 8) {
    return {
      tone: "error",
      message: "Escribí tu email y una contraseña de al menos 8 caracteres.",
    };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    // El registro de emails no habilitados lo bloquea la base de datos.
    const text = error.message.toLowerCase();
    const message =
      MESSAGES[error.code ?? ""] ??
      (text.includes("database")
        ? NOT_ALLOWED
        : text.includes("email") && (text.includes("send") || text.includes("authorized"))
          ? EMAIL_SETUP
          : "No se pudo crear la cuenta. Probá de nuevo.");
    return { tone: "error", message };
  }

  if (data.session) redirect("/dashboard");

  return {
    tone: "info",
    message:
      "Listo. Te enviamos un email para confirmar la cuenta: tocá el enlace y después volvé acá a ingresar con tu contraseña.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
