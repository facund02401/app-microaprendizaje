"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-card px-3 font-sans text-[15px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-ring/60";

export function LoginForm({ confirmed }: { confirmed: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(
    signIn,
    {}
  );
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(
    signUp,
    {}
  );

  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signingIn : signingUp;

  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div
        role="tablist"
        aria-label="Forma de ingreso"
        className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
      >
        {(
          [
            ["signin", "Ingresar"],
            ["signup", "Primera vez"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "min-h-10 rounded-sm font-sans text-[14px] focus-visible:outline-2 focus-visible:outline-ring/60",
              mode === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {confirmed && !state.message && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2.5 font-sans text-[13.5px] leading-relaxed text-foreground">
          Tu email quedó confirmado. Ingresá con tu contraseña.
        </p>
      )}

      <form action={mode === "signin" ? signInAction : signUpAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block font-sans text-[13px] text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block font-sans text-[13px] text-muted-foreground">
            {mode === "signin" ? "Contraseña" : "Elegí una contraseña (mínimo 8 caracteres)"}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
              className={cn(inputClass, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {state.message && (
          <p
            role="status"
            className={cn(
              "rounded-md px-3 py-2.5 font-sans text-[13.5px] leading-relaxed",
              state.tone === "error"
                ? "border border-border bg-muted text-foreground"
                : "bg-muted text-foreground"
            )}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-md bg-primary font-sans text-[15px] font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60 disabled:opacity-60"
        >
          {pending
            ? "Un momento…"
            : mode === "signin"
              ? "Ingresar"
              : "Crear mi cuenta"}
        </button>
      </form>

      {mode === "signup" && (
        <p className="mt-4 font-sans text-[12.5px] leading-relaxed text-muted-foreground">
          Nodos es de uso personal: solo el email habilitado puede crear cuenta.
          Después de crearla vas a recibir un correo para confirmarla.
        </p>
      )}
    </div>
  );
}
