"use client";

import { useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/use-is-client";

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type Ctor = new () => SpeechRecognitionLike;

function recognitionCtor(): Ctor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Browser speech-to-text (Chrome, Safari). Resolves to `supported: false` elsewhere. */
export function useDictation(onText: (text: string) => void) {
  const supported = useClientValue(() => Boolean(recognitionCtor()), false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognitionLike | null>(null);
  const callback = useRef(onText);
  useEffect(() => {
    callback.current = onText;
  });

  useEffect(() => () => ref.current?.stop(), []);

  function start() {
    const Recognition = recognitionCtor();
    if (!Recognition) return;
    setError(null);
    const rec = new Recognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .slice(e.resultIndex)
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join(" ");
      if (text) callback.current(text.trim());
    };
    rec.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone permission was denied." : "Couldn't hear that. Try again.");
    rec.onend = () => setListening(false);
    ref.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    ref.current?.stop();
  }

  return { supported, listening, error, start, stop };
}
