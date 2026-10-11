// Live river/bayou gauges for greater Houston from the National Water Prediction
// Service (NOAA). Free, no API key. Requests go through the Vite proxy at /nwps
// (see vite.config.ts) to avoid browser CORS issues.
import { useEffect, useState } from "react";

export type RiskLevel = "normal" | "watch" | "flooding" | "unknown";

export interface Gauge {
  id: string; // NWS location id, e.g. "BAKT2"
  name: string;
  lat: number;
  lon: number;
  levelFt: number | null; // latest observed stage
  actionStageFt: number | null; // "watch" threshold
  floodStageFt: number | null; // minor flood stage
  category: string; // raw NWS category, e.g. "no_flooding", "minor"
  risk: RiskLevel;
  observedAt: string | null; // ISO time of the reading
}

export const LIVE_RISK_COLOR: Record<RiskLevel, string> = {
  normal: "#25b5d8", // cyan
  watch: "#ff9a70", // light orange, drawn dashed
  flooding: "#ff6b35", // alert orange
  unknown: "#7f93b8", // muted navy
};

// Greater Houston: Katy/Fulshear/Rosenberg to Baytown, Pearland/League City to Conroe
const BBOX = { xmin: -96.0, ymin: 29.4, xmax: -94.9, ymax: 30.4 };
const API = "/nwps/v1";
const CACHE_MS = 60_000; // reuse readings for a minute so the map and agents agree

interface NwpsGauge {
  lid: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: {
    observed?: { primary: number; primaryUnit: string; floodCategory: string; validTime: string };
  };
}

interface NwpsGaugeDetail {
  flood?: { categories?: Record<string, { stage: number }> };
}

function toRisk(category: string): RiskLevel {
  switch (category) {
    case "no_flooding":
      return "normal";
    case "action":
      return "watch";
    case "minor":
    case "moderate":
    case "major":
      return "flooding";
    default:
      return "unknown"; // not_defined, obs_not_current, out_of_service, ...
  }
}

const validStage = (v: number | undefined) => (typeof v === "number" && v > -999 ? v : null);

// Flood thresholds rarely change, so fetch them once per gauge and keep them
const thresholdCache = new Map<string, { action: number | null; minor: number | null }>();

async function getThresholds(lid: string) {
  const hit = thresholdCache.get(lid);
  if (hit) return hit;
  try {
    const res = await fetch(`${API}/gauges/${lid}`);
    const detail = (await res.json()) as NwpsGaugeDetail;
    const cats = detail.flood?.categories ?? {};
    const t = { action: validStage(cats.action?.stage), minor: validStage(cats.minor?.stage) };
    thresholdCache.set(lid, t);
    return t;
  } catch {
    return { action: null, minor: null };
  }
}

let cache: { at: number; data: Gauge[] } | null = null;
let inflight: Promise<Gauge[]> | null = null;

/** Latest readings for every gauge in the Houston area (cached for 60s). */
export async function fetchGauges(force = false): Promise<Gauge[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    const qs = new URLSearchParams({
      "bbox.xmin": String(BBOX.xmin),
      "bbox.ymin": String(BBOX.ymin),
      "bbox.xmax": String(BBOX.xmax),
      "bbox.ymax": String(BBOX.ymax),
      srid: "EPSG_4326",
    });
    const res = await fetch(`${API}/gauges?${qs}`);
    if (!res.ok) throw new Error(`NWPS ${res.status}`);
    const { gauges } = (await res.json()) as { gauges: NwpsGauge[] };

    const data = await Promise.all(
      gauges.map(async (g): Promise<Gauge> => {
        const obs = g.status?.observed;
        const t = await getThresholds(g.lid);
        const category = obs?.floodCategory ?? "unknown";
        return {
          id: g.lid,
          name: g.name,
          lat: g.latitude,
          lon: g.longitude,
          levelFt: obs && obs.primaryUnit === "ft" ? validStage(obs.primary) : null,
          actionStageFt: t.action,
          floodStageFt: t.minor,
          category,
          risk: toRisk(category),
          observedAt: obs?.validTime && !obs.validTime.startsWith("0001") ? obs.validTime : null,
        };
      }),
    );

    cache = { at: Date.now(), data };
    return data;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** React hook: live gauges, refreshed every 5 minutes. */
export function useGauges(refreshMs = 5 * 60_000) {
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (force: boolean) => {
      try {
        const data = await fetchGauges(force);
        if (!alive) return;
        setGauges(data);
        setUpdatedAt(new Date());
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load gauges");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load(false);
    const timer = setInterval(() => load(true), refreshMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshMs]);

  return { gauges, loading, error, updatedAt };
}

const SEVERITY: Record<RiskLevel, number> = { flooding: 0, watch: 1, normal: 2, unknown: 3 };

/** Most urgent first, then alphabetical. */
export function sortBySeverity(gauges: Gauge[]) {
  return [...gauges].sort((a, b) => SEVERITY[a.risk] - SEVERITY[b.risk] || a.name.localeCompare(b.name));
}

export function timeAgo(iso: string | null) {
  if (!iso) return "no recent reading";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}

/** Straight-line distance in miles between two [lat, lon] points. */
export function milesBetween(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 3959 * 2 * Math.asin(Math.sqrt(h));
}

/** Nearest first. */
export function sortByDistance(gauges: Gauge[], from: [number, number]) {
  return gauges
    .map((g) => ({ ...g, distanceMi: milesBetween(from, [g.lat, g.lon]) }))
    .sort((a, b) => a.distanceMi - b.distanceMi);
}