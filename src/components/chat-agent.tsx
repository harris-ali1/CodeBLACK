// FloodLine text chat. Same ElevenLabs agent, brain (Gemini) and tools as the
// voice agent, just typed instead of spoken. Useful when someone can't talk or
// hear: deaf / hard of hearing, a loud shelter, or a situation where they need
// to stay quiet.
//
// Guests get a limited number of questions (`guestLimit`); signed-in users are unlimited.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Loader2, Lock } from "lucide-react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { useFloodTools } from "@/lib/use-flood-tools";
import { cn } from "@/lib/utils";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

const SUGGESTIONS = ["Is Brays Bayou flooding?", "Which bayous are at risk?", "¿Debo salir de casa?"];

// Remembers how many free questions a guest has used, so a page refresh doesn't reset it
const GUEST_COUNT_KEY = "floodline_guest_questions";
const readGuestCount = () => {
  try {
    return Number(localStorage.getItem(GUEST_COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeGuestCount = (n: number) => {
  try {
    localStorage.setItem(GUEST_COUNT_KEY, String(n));
  } catch {
    /* storage blocked: the limit still applies for this page view */
  }
};

type ChatMessage = { role: "user" | "agent"; text: string };

interface ChatAgentProps {
  onFocusGauge?: (gaugeId: string) => void;
  householdNotes?: string;
  /** Max questions before asking the user to sign in. Omit for unlimited (signed-in users). */
  guestLimit?: number;
  className?: string;
}

export default function ChatAgent(props: ChatAgentProps) {
  if (!AGENT_ID) {
    return (
      <p className="rounded-xl border border-alert-500/30 bg-alert-500/10 p-3 text-sm text-alert-300">
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

function ChatAgentInner({ onFocusGauge, householdNotes = "none provided", guestLimit, className }: ChatAgentProps) {
  const { startSession, endSession, sendUserMessage } = useConversationControls();
  const { status, message: errorMessage } = useConversationStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [used, setUsed] = useState(() => (guestLimit !== undefined ? readGuestCount() : 0));
  const pending = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isGuest = guestLimit !== undefined;
  const remaining = isGuest ? Math.max(0, guestLimit - used) : Infinity;
  const locked = isGuest && remaining === 0;

  useFloodTools(onFocusGauge);

  // End the chat session if the user leaves the page or switches tabs
  useEffect(() => () => endSession(), [endSession]);

  // Keep the newest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, waiting, locked]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || locked || waiting) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setWaiting(true);

    if (isGuest) {
      const next = used + 1;
      setUsed(next);
      writeGuestCount(next);
    }

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

  // Once the last free answer has arrived, close the session
  useEffect(() => {
    if (locked && !waiting && status === "connected") endSession();
  }, [locked, waiting, status, endSession]);

  const connecting = status === "connecting";

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div ref={scrollRef} className="flex max-h-72 min-h-40 flex-col gap-2 overflow-y-auto text-left text-sm">
        {messages.length === 0 && !locked && (
          <div className="flex flex-col gap-2">
            <p className="text-center text-xs text-navy-500">Ask in English or Spanish</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-xl border border-navy-800 bg-navy-950/60 px-3 py-2 text-left text-navy-300 transition-colors hover:border-cyan-500/40 hover:text-white"
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
              m.role === "agent" ? "self-start bg-navy-800/80 text-navy-200" : "self-end bg-cyan-500/15 text-cyan-100",
            )}
          >
            {m.text}
          </p>
        ))}

        {(waiting || connecting) && (
          <p className="flex items-center gap-2 self-start px-1 text-xs text-navy-500">
            <Loader2 className="h-3 w-3 animate-spin" /> FloodLine is typing…
          </p>
        )}

        {locked && !waiting && (
          <div className="mt-1 flex flex-col items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center">
            <Lock className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-medium text-white">You've used your {guestLimit} free questions</p>
            <p className="text-xs text-navy-400">
              Sign in to keep chatting, talk to FloodLine by voice, and get alerts for your home.
            </p>
            <Link
              to="/auth"
              state={{ from: "/map" }}
              className="mt-1 rounded-lg bg-cyan-400 px-4 py-1.5 text-sm font-bold text-navy-950 hover:bg-cyan-300"
            >
              Sign in to continue
            </Link>
          </div>
        )}
      </div>

      {status === "error" && errorMessage && <p className="text-xs text-alert-300">{errorMessage}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-800/60 p-1.5 pl-3 focus-within:border-cyan-500/50",
          locked && "opacity-50",
        )}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={locked}
          placeholder={locked ? "Sign in to ask more" : "Type your question…"}
          className="min-w-0 flex-1 bg-transparent text-sm text-navy-100 outline-none placeholder:text-navy-500 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!input.trim() || locked || waiting}
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-navy-950 transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      {isGuest && !locked && (
        <p className="text-center text-xs text-navy-500">
          {remaining} free {remaining === 1 ? "question" : "questions"} left ·{" "}
          <Link to="/auth" state={{ from: "/map" }} className="text-cyan-400 hover:text-cyan-300">
            Sign in
          </Link>{" "}
          for unlimited
        </p>
      )}
    </div>
  );
}