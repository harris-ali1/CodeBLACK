// Placeholder voice button. Gets wired to the ElevenLabs agent later.
import { useState } from "react";
import { motion } from "motion/react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VoiceOrb({ className }: { className?: string }) {
  const [active, setActive] = useState(false);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        onClick={() => setActive((a) => !a)}
        aria-label={active ? "Stop talking to FloodLine" : "Talk to FloodLine"}
        className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 transition-colors hover:bg-cyan-500/20"
      >
        {active && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full border border-cyan-400/50"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full border border-cyan-400/40"
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
            />
          </>
        )}
        {active ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
      </button>
      <p className="text-sm text-navy-400">{active ? "Listening… tap to stop" : "Tap to talk"}</p>
    </div>
  );
}