// FloodLine text chat. Same ElevenLabs agent, brain (Gemini) and tools as the
// voice agent, just typed instead of spoken. Useful when someone can't talk or
// hear: deaf / hard of hearing, a loud shelter, or a situation where they need
// to stay quiet.
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { useFloodTools } from "@/lib/use-flood-tools";
import { cn } from "@/lib/utils";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

const SUGGESTIONS = ["Is Brays Bayou flooding?", "Which bayous are at risk?", "¿Debo salir de casa?"];

type ChatMessage = { role: "user" | "agent"; text: string };

interface ChatAgentProps {
  onFocusGauge?: (gaugeId: string) => void;
  householdNotes?: string;
  className?: string;
}

export default function ChatAgent(props: ChatAgentProps) {
  if (!AGENT_ID) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
        Add VITE_ELEVENLABS_AGENT_ID to .env.local and restart the dev server.
      </p>
    );
  }
  return (
    <ConversationProvider agentId={AGENT_ID}>
      <ChatAgentInner {...props} />
    </ConversationProvider>
  );
}

function ChatAgentInner({ onFocusGauge, householdNotes = "none provided", className }: ChatAgentProps) {
  const { startSession, endSession, sendUserMessage } = useConversationControls();
  const { status, message: errorMessage } = useConversationStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const pending = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useFloodTools(onFocusGauge);

  // End the chat session if the user leaves the page or switches tabs
  useEffect(() => () => endSession(), [endSession]);

  // Keep the newest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setWaiting(true);

    if (status === "connected") {
      sendUserMessage(text);
      return;
    }

    // First message: open a text-only session, then send once connected
    pending.current = text;
    startSession({
      textOnly: true,
      dynamicVariables: {
        preferred_language: "the same language the user writes in",
        household_notes: householdNotes,
      },
      onConnect: () => {
        if (pending.current) {
          sendUserMessage(pending.current);
          pending.current = null;
        }
      },
      // Only agent replies come from here; user messages are added locally
      onMessage: ({ message, role }) => {
        if (role !== "agent") return;
        setMessages((m) => [...m, { role: "agent", text: message }]);
        setWaiting(false);
      },
      onError: () => setWaiting(false),
      onDisconnect: () => setWaiting(false),
    });
  };

  const connecting = status === "connecting";

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div ref={scrollRef} className="flex max-h-72 min-h-40 flex-col gap-2 overflow-y-auto text-left text-sm">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-center text-xs text-zinc-500">Ask in English or Spanish</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left text-zinc-300 transition-colors hover:border-sky-500/40 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <p
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2",
              m.role === "agent" ? "self-start bg-zinc-800/80 text-zinc-200" : "self-end bg-sky-500/15 text-sky-100",
            )}
          >
            {m.text}
          </p>
        ))}

        {(waiting || connecting) && (
          <p className="flex items-center gap-2 self-start px-1 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> FloodLine is typing…
          </p>
        )}
      </div>

      {status === "error" && errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 p-1.5 pl-3 focus-within:border-sky-500/50"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-900 transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}