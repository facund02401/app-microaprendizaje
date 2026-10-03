"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DEFAULT_TTS_RATE,
  TTS_RATES,
  TTS_RATE_KEY,
  TTS_VOICE_KEY,
  buildSpeechChunks,
  pickVoice,
  spanishVoices,
  type SpeechChunk,
} from "@/lib/tts";
import type { ConceptNode } from "@/types";

/**
 * Lectura en voz alta del nodo (docs/10 D18): voz del navegador, gratis y sin
 * servidor. Opcional: no empieza sola ni avanza de nodo al terminar. Se lee por
 * frases (Chrome corta los textos largos) y se resalta tenuemente el párrafo en curso.
 */

type Status = "idle" | "playing" | "paused";

/** Una reproducción en curso. Cancelarla hace que sus callbacks queden inertes. */
interface Session {
  chunks: SpeechChunk[];
  index: number;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  cancelled: boolean;
  lastParagraph: number | null;
  onParagraph: (paragraph: number | null) => void;
  onDone: () => void;
  /** Referencia viva: si el navegador recolecta la frase, `onend` nunca llega. */
  utterance?: SpeechSynthesisUtterance;
}

/** Nivel de módulo: toca el navegador fuera del ciclo de render (regla React Compiler). */
function speakNext(s: Session) {
  if (s.cancelled) return;
  if (s.index >= s.chunks.length) {
    s.onDone();
    return;
  }
  const chunk = s.chunks[s.index];
  if (chunk.paragraph !== s.lastParagraph) {
    s.lastParagraph = chunk.paragraph;
    s.onParagraph(chunk.paragraph);
    if (chunk.paragraph !== null) {
      const el = document.querySelector(`#node-article [data-p="${chunk.paragraph}"]`);
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
  }
  const u = new SpeechSynthesisUtterance(chunk.text);
  u.lang = s.voice?.lang ?? "es-ES";
  if (s.voice) u.voice = s.voice;
  u.rate = s.rate;
  u.onend = () => {
    if (s.cancelled) return;
    s.index += 1;
    speakNext(s);
  };
  u.onerror = (e) => {
    if (s.cancelled || e.error === "interrupted" || e.error === "canceled") return;
    s.onDone();
  };
  s.utterance = u;
  window.speechSynthesis.speak(u);
}

function stopSession(s: Session | null) {
  if (!s) return;
  s.cancelled = true;
  window.speechSynthesis.cancel();
}

function storedRate(): number {
  if (typeof window === "undefined") return DEFAULT_TTS_RATE;
  try {
    const raw = Number(localStorage.getItem(TTS_RATE_KEY));
    return (TTS_RATES as readonly number[]).includes(raw) ? raw : DEFAULT_TTS_RATE;
  } catch {
    return DEFAULT_TTS_RATE;
  }
}

function storedVoice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TTS_VOICE_KEY);
  } catch {
    return null;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

const noopSubscribe = () => () => {};

const buttonClass =
  "flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 md:p-1.5";

export function ReadAloud({
  node,
  onParagraph,
}: {
  node: Pick<ConceptNode, "title" | "excerptParagraphs">;
  /** Párrafo que se está leyendo (null = ninguno), para resaltarlo en el lienzo. */
  onParagraph: (paragraph: number | null) => void;
}) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false
  );
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState<number>(storedRate);
  const [voiceUri, setVoiceUri] = useState<string | null>(storedVoice);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [open, setOpen] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const resumeAtRef = useRef(0);
  const chunks = useMemo(() => buildSpeechChunks(node), [node]);

  // Las voces del navegador cargan de forma asíncrona.
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    const t = setTimeout(load, 0);
    synth.addEventListener("voiceschanged", load);
    return () => {
      clearTimeout(t);
      synth.removeEventListener("voiceschanged", load);
    };
  }, [supported]);

  // Al cambiar de nodo (o salir del lector) el componente se desmonta y la voz se corta.
  useEffect(
    () => () => {
      stopSession(sessionRef.current);
      sessionRef.current = null;
    },
    []
  );

  const voice = pickVoice(voices, voiceUri);
  const spanish = spanishVoices(voices);

  function start(from: number, nextRate = rate, nextVoice = voice) {
    stopSession(sessionRef.current);
    const session: Session = {
      chunks,
      index: from,
      rate: nextRate,
      voice: nextVoice,
      cancelled: false,
      lastParagraph: null,
      onParagraph,
      onDone: () => {
        if (session.cancelled) return;
        sessionRef.current = null;
        resumeAtRef.current = 0;
        setStatus("idle");
        onParagraph(null);
      },
    };
    sessionRef.current = session;
    setStatus("playing");
    speakNext(session);
  }

  function pause() {
    const s = sessionRef.current;
    if (!s) return;
    // Pausar = cortar y recordar la frase: funciona igual en todos los navegadores.
    resumeAtRef.current = s.index;
    stopSession(s);
    sessionRef.current = null;
    setStatus("paused");
  }

  function stop() {
    stopSession(sessionRef.current);
    sessionRef.current = null;
    resumeAtRef.current = 0;
    setStatus("idle");
    onParagraph(null);
  }

  function restartIfPlaying(nextRate: number, nextVoice: SpeechSynthesisVoice | null) {
    if (status === "playing" && sessionRef.current) {
      start(sessionRef.current.index, nextRate, nextVoice);
    }
  }

  if (!supported || chunks.length === 0) return null;

  const mainLabel =
    status === "playing" ? "Pausar lectura" : status === "paused" ? "Continuar lectura" : "Leer en voz alta";
  const MainIcon = status === "playing" ? Pause : status === "paused" ? Play : Volume2;

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => {
          if (status === "playing") pause();
          else start(status === "paused" ? resumeAtRef.current : 0);
        }}
        aria-label={mainLabel}
        title={mainLabel}
        className={buttonClass}
      >
        <MainIcon className="size-4" aria-hidden="true" />
      </button>
      {status !== "idle" && (
        <button type="button" onClick={stop} aria-label="Detener lectura" title="Detener lectura" className={buttonClass}>
          <Square className="size-3.5" aria-hidden="true" />
        </button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-expanded={open}
            aria-label="Velocidad y voz de la lectura en voz alta"
            title="Velocidad y voz"
            className="rounded-md px-2 py-1.5 font-mono text-[13px] leading-none text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 md:px-1.5 md:py-2"
          >
            {rate}×
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-64 p-2">
          <div role="radiogroup" aria-label="Velocidad de lectura" className="flex items-center gap-1">
            {TTS_RATES.map((r) => (
              <button
                key={r}
                role="radio"
                aria-checked={rate === r}
                onClick={() => {
                  setRate(r);
                  remember(TTS_RATE_KEY, String(r));
                  restartIfPlaying(r, voice);
                }}
                className={cn(
                  "min-h-[36px] flex-1 rounded-sm font-mono text-[12px] text-muted-foreground",
                  "hover:bg-muted hover:text-foreground",
                  "focus-visible:outline-2 focus-visible:outline-ring/60",
                  rate === r && "bg-muted text-foreground"
                )}
              >
                {r}×
              </button>
            ))}
          </div>
          {spanish.length > 0 ? (
            <label className="mt-2 block px-1">
              <span className="font-mono text-[10.5px] tracking-wide text-muted-foreground/70">voz</span>
              <select
                value={voice?.voiceURI ?? ""}
                onChange={(e) => {
                  const next = spanish.find((v) => v.voiceURI === e.target.value) ?? null;
                  setVoiceUri(next?.voiceURI ?? null);
                  if (next) remember(TTS_VOICE_KEY, next.voiceURI);
                  restartIfPlaying(rate, next);
                }}
                className="mt-1 min-h-[36px] w-full rounded-sm border border-border bg-background px-1.5 font-sans text-[12.5px] text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
              >
                {spanish.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-2 px-1 font-sans text-[12px] leading-relaxed text-muted-foreground">
              Este dispositivo no informa voces en español; se usa la voz predeterminada.
            </p>
          )}
          <p className="mt-1.5 px-1 font-mono text-[10.5px] tracking-wide text-muted-foreground/70">
            lectura en voz alta
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
