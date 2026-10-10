// Placeholder data until the FastAPI backend is wired up.

export type RiskLevel = "normal" | "watch" | "flooding";

export interface Gauge {
  id: string;
  name: string;
  watershed: string;
  lat: number;
  lon: number;
  levelFt: number;
  floodStageFt: number;
  risk: RiskLevel;
}

export const HOUSTON: [number, number] = [29.7604, -95.3698];

export const MOCK_GAUGES: Gauge[] = [
  { id: "08074500", name: "Buffalo Bayou at Shepherd Dr", watershed: "Buffalo Bayou", lat: 29.7602, lon: -95.4085, levelFt: 24.1, floodStageFt: 30, risk: "watch" },
  { id: "08075000", name: "Brays Bayou at Main St", watershed: "Brays Bayou", lat: 29.7046, lon: -95.4002, levelFt: 33.2, floodStageFt: 31, risk: "flooding" },
  { id: "08074200", name: "White Oak Bayou at Heights Blvd", watershed: "White Oak Bayou", lat: 29.7779, lon: -95.3966, levelFt: 12.4, floodStageFt: 28, risk: "normal" },
  { id: "08076000", name: "Greens Bayou near Houston", watershed: "Greens Bayou", lat: 29.9183, lon: -95.3069, levelFt: 19.7, floodStageFt: 24, risk: "watch" },
  { id: "08073600", name: "Buffalo Bayou at W Belt Dr", watershed: "Buffalo Bayou", lat: 29.7619, lon: -95.5577, levelFt: 41.0, floodStageFt: 45, risk: "normal" },
];

export const RISK_COLOR: Record<RiskLevel, string> = {
  normal: "#25b5d8", // cyan
  watch: "#ff9a70", // light orange, drawn dashed on the map
  flooding: "#ff6b35", // alert orange
};

export interface Alert {
  id: string;
  title: string;
  body: string;
  risk: RiskLevel;
  time: string;
}

export const MOCK_ALERTS: Alert[] = [
  { id: "a1", title: "Brays Bayou is above flood stage", body: "Water at Main St is 2.2 ft over flood stage and rising. Avoid Braeswood Blvd and nearby underpasses.", risk: "flooding", time: "4 min ago" },
  { id: "a2", title: "Buffalo Bayou watch", body: "Levels at Shepherd Dr are rising after heavy rain upstream. Expect street ponding over the next 2 hours.", risk: "watch", time: "22 min ago" },
  { id: "a3", title: "White Oak Bayou back to normal", body: "Levels near Heights Blvd have dropped below watch thresholds.", risk: "normal", time: "1 hr ago" },
];