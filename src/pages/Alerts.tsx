import { Play } from "lucide-react";
import { MOCK_ALERTS, RISK_COLOR } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Alerts() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white">Your alerts</h1>
        <p className="text-navy-400">Based on the gauges near your home. Tap play to hear any alert.</p>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_ALERTS.map((a) => (
          <article
            key={a.id}
            className={cn(
              "flex gap-4 rounded-2xl border p-5",
              a.risk === "flooding" ? "border-alert-500 bg-alert-500/10" : "border-navy-800 bg-navy-900",
            )}
          >
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={
                a.risk === "watch"
                  ? { border: `2px dashed ${RISK_COLOR.watch}` }
                  : { background: RISK_COLOR[a.risk] }
              }
            />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-semibold text-white">{a.title}</h2>
                <span className="shrink-0 text-xs text-navy-500">{a.time}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-navy-400">{a.body}</p>
            </div>
            {/* Will play ElevenLabs audio once the backend is wired */}
            <button
              aria-label="Play alert"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border transition-colors",
                a.risk === "flooding"
                  ? "border-alert-500 bg-alert-500 text-navy-950 hover:brightness-110"
                  : "border-navy-700 text-navy-300 hover:border-cyan-500/50 hover:text-cyan-300",
              )}
            >
              <Play className="h-4 w-4" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}