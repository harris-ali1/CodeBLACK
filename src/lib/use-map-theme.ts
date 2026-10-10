// Picks a day or night basemap from the sun's position over Houston, like Google Maps.
// Append ?map=day or ?map=night to the URL to force one while testing.
import { useEffect, useState } from "react";
import { getTimes } from "suncalc";
import { HOUSTON } from "@/lib/mock-data";

export type MapTheme = "day" | "night";

// CARTO now requires a key on every tile request.
const CARTO_KEY = "cb1_4gm9_1_8794dbea55a0f8c75afeece8";

export const TILES: Record<MapTheme, string> = {
  day: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
  night: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
};

function themeFor(now: Date): MapTheme {
  const forced = new URLSearchParams(window.location.search).get("map");
  if (forced === "day" || forced === "night") return forced;
  const { sunrise, sunset } = getTimes(now, HOUSTON[0], HOUSTON[1]);
  if (!sunrise || !sunset) return "day"; // no sunrise/sunset (polar edge case)
  return now < sunrise || now > sunset ? "night" : "day";
}

export function useMapTheme(): MapTheme {
  const [theme, setTheme] = useState<MapTheme>(() => themeFor(new Date()));

  // Re-check every minute so the map flips at sunrise/sunset without a reload.
  useEffect(() => {
    const id = setInterval(() => setTheme(themeFor(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  return theme;
}
