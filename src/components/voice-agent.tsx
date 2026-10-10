// FloodLine voice agent, powered by ElevenLabs Agents.
// The agent's prompt, voice and LLM (Gemini) live in the ElevenLabs dashboard;
// this file handles the mic, the animated orb, live captions and client tools.
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { getFloodStatus } from "@/lib/voice-tools";
import { cn } from "@/lib/utils";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

type Lang = "en" | "es";
type Caption = { role: "user" | "agent"; text: string };

interface VoiceAgentProps {
  /** Called when the agent asks the map to zoom to a gauge. */
  onFocusGauge?: (gaugeId: string) => void;
  /** Household context from the profile page, passed to the agent's prompt. */
  householdNotes?: string;
  className?: string;
}

export default function VoiceAgent(props: VoiceAgentProps) {
  if (!AGENT_ID) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
        Add VITE_ELEVENLABS_AGENT_ID to .env.local and restart the dev server.
      </p>
    );
  }
  return (
    <ConversationProvider agentId={AGENT_ID}>
      <VoiceAgentInner {...props} />
    </ConversationProvider>
  );
}

function VoiceAgentInner({ onFocusGauge, householdNotes = "none provided", className }: VoiceAgentProps) {
  const { startSession, endSession, getInputVolume, getOutputVolume } = useConversationControls();
  const { status, message: errorMessage } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const [lang, setLang] = useState<Lang>("en");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const raf = useRef<number | null>(null);

  const connected = status === "connected";
  const connecting = status === "connecting";

  // Client tools. Names must match the tools configured on the agent.
  useConversationClientTool("get_flood_status", (params: { location?: string }) => getFloodStatus(params));
  useConversationClientTool("focus_gauge", (params: { gauge_id?: string }) => {
    if (params.gauge_id) onFocusGauge?.(params.gauge_id);
    return "Map is now showing that gauge.";
  });

  // Drive the orb size from live audio volume
  useEffect(() => {
    if (!connected) {
      setLevel(0);
      return;
    }
    const tick = () => {
      const v = isSpeaking ? getOutputVolume() : getInputVolume();
      setLevel((prev) => prev * 0.7 + Math.min(1, v * 2) * 0.3); // smooth it
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [connected, isSpeaking, getInputVolume, getOutputVolume]);

  const start = async () => {
    setMicError(null);
    setCaptions([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("Microphone access was blocked. Allow it in the browser and try again.");
      return;
    }
    startSession({
      dynamicVariables: {
        preferred_language: lang === "es" ? "Spanish" : "English",
        household_notes: householdNotes,
      },
      onMessage: ({ message, role }) =>
        setCaptions((c) => [...c.slice(-5), { role, text: message }]),
    });
  };

  const label = connecting
    ? "Connecting…"
    : connected
      ? isSpeaking
        ? "FloodLine is speaking"
        : "Listening…"
      : lang === "es"
        ? "Toca para hablar"
        : "Tap to talk";

  return (
    <div className={cn("flex w-full flex-col items-center gap-4", className)}>
      {/* Language picker, locked during a call */}
      <div className="flex rounded-full border border-zinc-800 p-0.5 text-xs">
        {(["en", "es"] as const).map((l) => (
          <button
            key={l}
            disabled={connected || connecting}
            onClick={() => setLang(l)}
            className={cn(
              "rounded-full px-3 py-1 transition-colors disabled:cursor-not-allowed",
              lang === l ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white",
            )}
          >
            {l === "en" ? "English" : "Español"}
          </button>
        ))}
      </div>

      {/* Orb */}
      <button
        onClick={connected ? () => endSession() : start}
        disabled={connecting}
        aria-label={connected ? "End conversation" : "Talk to FloodLine"}
        className="relative flex h-24 w-24 items-center justify-center"
      >
        <motion.span
          className={cn(
            "absolute inset-0 rounded-full blur-xl",
            isSpeaking ? "bg-sky-400/40" : "bg-sky-500/20",
          )}
          animate={{ scale: 1 + level * 0.8, opacity: connected ? 0.5 + level * 0.5 : 0.3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        <motion.span
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full border transition-colors",
            connected
              ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
              : "border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20",
          )}
          animate={{ scale: 1 + level * 0.15 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {connecting ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : connected ? (
            <PhoneOff className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </motion.span>
      </button>

      <p className="text-sm text-zinc-400">{label}</p>

      {(micError || (status === "error" && errorMessage)) && (
        <p className="text-center text-xs text-red-400">{micError || errorMessage}</p>
      )}

      {/* Live captions */}
      {captions.length > 0 && (
        <div className="flex max-h-48 w-full flex-col gap-2 overflow-y-auto text-left text-sm">
          {captions.map((c, i) => (
            <p
              key={i}
              className={cn(
                "rounded-xl px-3 py-2",
                c.role === "agent" ? "bg-zinc-800/80 text-zinc-200" : "self-end bg-sky-500/10 text-sky-200",
              )}
            >
              {c.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}