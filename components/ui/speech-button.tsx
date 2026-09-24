"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n";
import { SPEECH_LANG } from "@/lib/voice";

// The browser's speech recognition isn't in TypeScript's built-in types.
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// Not supported everywhere (e.g. Firefox), so the button only appears where it works.
const subscribe = () => () => {};
const supportedNow = () => recognitionCtor() !== undefined;
const supportedOnServer = () => false;

/** A small "Speak" button: dictates into a text field via the browser's speech recognition. */
export function SpeechButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const t = useTranslations("voice");
  const locale = useLocale() as Locale;
  const supported = useSyncExternalStore(subscribe, supportedNow, supportedOnServer);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<"blocked" | "failed" | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  // Stop listening if the field goes away.
  useEffect(() => () => rec.current?.stop(), []);

  if (!supported) return null;

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setProblem(null);

    const r = new Ctor();
    r.lang = SPEECH_LANG[locale] ?? "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let spoken = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) spoken += e.results[i][0].transcript;
      }
      if (spoken.trim()) onTextRef.current(spoken);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setProblem("blocked");
      else if (e.error !== "no-speech" && e.error !== "aborted") setProblem("failed");
    };
    r.onend = () => setListening(false);

    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setProblem("failed");
    }
  }

  function toggle() {
    if (listening) rec.current?.stop();
    else start();
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-body-sm transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso",
          listening
            ? "border-rose-deep bg-rose/40 text-espresso"
            : "border-hairline-strong bg-surface text-espresso hover:bg-rose/30",
          className,
        )}
      >
        {listening ? (
          <>
            <Square size={14} className="animate-pulse text-rose-deep" aria-hidden />
            {t("stop")}
          </>
        ) : (
          <>
            <Mic size={14} aria-hidden />
            {t("speak")}
          </>
        )}
      </button>
      {listening && (
        <span role="status" className="text-body-sm text-walnut">
          {t("listening")}
        </span>
      )}
      {problem && (
        <span role="alert" className="max-w-56 text-right text-body-sm text-error">
          {t(problem)}
        </span>
      )}
    </span>
  );
}
