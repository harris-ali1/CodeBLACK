import { Play } from "lucide-react";
import { MOCK_ALERTS, RISK_COLOR } from "@/lib/mock-data";

export default function Alerts() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white">Your alerts</h1>
        <p className="text-zinc-400">Based on the gauges near your home. Tap play to hear any alert.</p>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_ALERTS.map((a) => (
          <article key={a.id} className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: RISK_COLOR[a.risk] }} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-semibold text-white">{a.title}</h2>
                <span className="shrink-0 text-xs text-zinc-500">{a.time}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{a.body}</p>
            </div>
            {/* Will play ElevenLabs audio once the backend is wired */}
            <button
              aria-label="Play alert"
              className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-sky-500/50 hover:text-sky-300"
            >
              <Play className="h-4 w-4" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}