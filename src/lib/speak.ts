// Plays text in the FloodLine voice using ElevenLabs text-to-speech.
// Calls go through the /tts dev-server proxy (vite.config.ts), which adds the
// API key server-side.
import { useEffect, useRef, useState } from "react";

// Voice to use. Copy an ID from ElevenLabs → Voices (e.g. the agent's voice).
const VOICE_ID = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string | undefined) || "JBFqnCBsd6RMkjVDRZzb";

const audioCache = new Map<string, string>(); // text -> object URL, so replays are instant

async function synthesize(text: string): Promise<string> {
  const hit = audioCache.get(text);
  if (hit) return hit;

  const res = await fetch(`/tts/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Multilingual model so Spanish alerts sound natural too
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      res.status === 401
        ? "ElevenLabs rejected the API key. Check ELEVENLABS_API_KEY in .env.local and restart the dev server."
        : `Text-to-speech failed (${res.status}) ${detail.slice(0, 120)}`,
    );
  }
  const url = URL.createObjectURL(await res.blob());
  audioCache.set(text, url);
  return url;
}

export type SpeakState = "idle" | "loading" | "playing";

/** One shared player: starting a new clip stops the previous one. */
export function useSpeaker() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, setState] = useState<SpeakState>("idle");

  const stop = () => {
    audio.current?.pause();
    audio.current = null;
    setActiveId(null);
    setState("idle");
  };

  useEffect(() => () => audio.current?.pause(), []);

  /** Toggle: plays `text` for `id`, or stops it if it's already playing. */
  const toggle = async (id: string, text: string) => {
    if (activeId === id) {
      stop();
      return;
    }
    stop();
    setActiveId(id);
    setState("loading");
    try {
      const url = await synthesize(text);
      const el = new Audio(url);
      audio.current = el;
      el.onended = () => {
        if (audio.current === el) stop();
      };
      await el.play();
      if (audio.current === el) setState("playing");
    } catch (e) {
      stop();
      throw e;
    }
  };

  return { activeId, state, toggle, stop };
}