// Hurricane Beryl (Jul 2024) replay. The hourly readings live in TigerData and are
// served by /api/beryl/replay (see server/beryl-replay.mjs).
import { useEffect, useState } from "react";
import type { Gauge, RiskLevel } from "@/lib/gauges";

interface ReplayGauge {
  id: string;
  name: string;
  lat: number;
  lon: number;
  floodStageFt: number;
  actionStageFt: number | null;
  stages: (number | null)[]; // one reading per hour
}

export interface BerylReplay {
  start: string; // ISO time of hour 0
  hours: number;
  gauges: ReplayGauge[];
}

export function useBerylReplay(enabled: boolean) {
  const [data, setData] = useState<BerylReplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || data) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("/api/beryl/replay")
      .then((r) => (r.ok ? (r.json() as Promise<BerylReplay>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled, data]);

  return { data, loading, error };
}

function riskAt(stage: number | null, g: ReplayGauge): RiskLevel {
  if (stage === null) return "unknown";
  if (stage >= g.floodStageFt) return "flooding";
  if (g.actionStageFt !== null && stage >= g.actionStageFt) return "watch";
  return "normal";
}

/** The gauges as they were `hour` hours into the replay, in the same shape as live gauges. */
export function gaugesAtHour(data: BerylReplay, hour: number): Gauge[] {
  const at = new Date(new Date(data.start).getTime() + hour * 3_600_000).toISOString();
  return data.gauges.map((g) => {
    const stage = g.stages[hour] ?? null;
    const risk = riskAt(stage, g);
    return {
      id: g.id,
      name: g.name,
      lat: g.lat,
      lon: g.lon,
      levelFt: stage === null ? null : Math.round(stage * 10) / 10,
      actionStageFt: g.actionStageFt,
      floodStageFt: g.floodStageFt,
      category: risk,
      risk,
      observedAt: at,
    };
  });
}

/** e.g. "Mon, Jul 8 · 10:00 AM CDT" */
export function replayTimeLabel(data: BerylReplay, hour: number) {
  const d = new Date(new Date(data.start).getTime() + hour * 3_600_000);
  const day = d.toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${day} · ${time}`;
}
