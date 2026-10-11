// Data the voice and text agents look up through the get_flood_status client tool.
// Reads the same live NWS gauges as the map, so what the agent says always
// matches what's on screen.
import { fetchGauges, milesBetween, timeAgo, type Gauge } from "@/lib/gauges";

// Set by the map page when the user shares their location
let userLocation: [number, number] | null = null;
export function setUserLocation(coords: [number, number] | null) {
  userLocation = coords;
}

const NEAR_ME = /\b(me|my|mine|here|nearby|around us|our)\b/;

// Approximate centers of Houston-area cities and neighborhoods, so questions like
// "Is Sugar Land flooding?" can be answered with the nearest gauges.
const PLACES: Record<string, [number, number]> = {
  downtown: [29.7604, -95.3698],
  houston: [29.7604, -95.3698],
  "sugar land": [29.6197, -95.6349],
  "missouri city": [29.6186, -95.5377],
  stafford: [29.6161, -95.5577],
  richmond: [29.5822, -95.7608],
  rosenberg: [29.5572, -95.8086],
  fulshear: [29.693, -95.8999],
  katy: [29.7858, -95.8245],
  cypress: [29.9691, -95.6972],
  tomball: [30.0972, -95.6161],
  spring: [30.0799, -95.4172],
  "the woodlands": [30.1658, -95.4613],
  woodlands: [30.1658, -95.4613],
  conroe: [30.3119, -95.4561],
  humble: [29.9988, -95.2622],
  kingwood: [30.0499, -95.1849],
  atascocita: [29.9988, -95.1766],
  aldine: [29.925, -95.38],
  greenspoint: [29.945, -95.415],
  baytown: [29.7355, -94.9774],
  channelview: [29.776, -95.1146],
  "galena park": [29.7336, -95.2302],
  pasadena: [29.6911, -95.2091],
  "deer park": [29.7052, -95.1238],
  "la porte": [29.6658, -95.0194],
  pearland: [29.5636, -95.286],
  friendswood: [29.5294, -95.201],
  "league city": [29.5075, -95.0949],
  "clear lake": [29.558, -95.1146],
  webster: [29.5377, -95.1183],
  "south houston": [29.663, -95.2355],
  bellaire: [29.7058, -95.4588],
  "west university": [29.7183, -95.4285],
  meyerland: [29.6869, -95.4588],
  braeswood: [29.6989, -95.4277],
  "medical center": [29.707, -95.401],
  "museum district": [29.7225, -95.3905],
  montrose: [29.747, -95.391],
  "the heights": [29.798, -95.398],
  heights: [29.798, -95.398],
  galleria: [29.739, -95.463],
  memorial: [29.7646, -95.48],
  "energy corridor": [29.7836, -95.6197],
  westchase: [29.727, -95.565],
  alief: [29.711, -95.596],
  "third ward": [29.733, -95.358],
  "fifth ward": [29.777, -95.336],
  "east end": [29.735, -95.33],
  "second ward": [29.752, -95.343],
  "acres homes": [29.865, -95.443],
  "spring branch": [29.802, -95.522],
};

function describe(g: Gauge, distanceMi?: number) {
  const parts = [`${g.name} (id ${g.id})`];
  if (distanceMi !== undefined) parts.push(`${distanceMi.toFixed(1)} miles away`);
  parts.push(g.levelFt !== null ? `water level ${g.levelFt} ft` : "no current water level");
  if (g.floodStageFt !== null) {
    const diff = +(g.levelFt !== null ? g.levelFt - g.floodStageFt : NaN).toFixed(1);
    parts.push(
      `flood stage ${g.floodStageFt} ft` +
        (Number.isFinite(diff) ? (diff >= 0 ? ` (${diff} ft ABOVE flood stage)` : ` (${Math.abs(diff)} ft below)`) : ""),
    );
  }
  parts.push(`status ${g.risk.toUpperCase()} (NWS category: ${g.category})`);
  parts.push(`reading ${timeAgo(g.observedAt)}`);
  return "- " + parts.join(", ");
}

/** Tool: get_flood_status({ location? }) */
export async function getFloodStatus(params: { location?: string }): Promise<string> {
  let gauges: Gauge[];
  try {
    gauges = await fetchGauges();
  } catch {
    return "Live gauge data is unavailable right now. Tell the user you can't reach the river gauges and to check local news or call 911 if in danger.";
  }

  const q = (params.location || "").toLowerCase().trim();

  const nearestTo = (from: [number, number], label: string) => {
    const nearest = gauges
      .map((g) => ({ g, d: milesBetween(from, [g.lat, g.lon]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    return [
      `Live NWS gauges nearest to ${label} (closest first):`,
      ...nearest.map(({ g, d }) => describe(g, d)),
      "Gauges measure the nearby creek or bayou, not individual streets.",
    ].join("\n");
  };

  if (q) {
    // 1. Known city or neighborhood -> nearest gauges
    const place = Object.keys(PLACES)
      .sort((a, b) => b.length - a.length)
      .find((p) => q.includes(p) || (q.length >= 4 && p.includes(q)));
    if (place) return nearestTo(PLACES[place], place);

    // 2. "near me", "my street", "here" -> the user's shared location
    if (NEAR_ME.test(q)) {
      if (userLocation) return nearestTo(userLocation, "the user's current location");
      return "The user hasn't shared their location. Ask which neighborhood or city they're in, or tell them to tap 'Use my location' on the map.";
    }

    // 3. Bayou / creek / river name -> matching gauges
    const words = q.split(/[\s,]+/).filter((w) => w.length > 3 && !["bayou", "creek", "river", "near"].includes(w));
    const matches = gauges.filter((g) => words.some((w) => g.name.toLowerCase().includes(w)));
    if (matches.length) {
      return [`Live NWS gauges matching "${params.location}":`, ...matches.map((g) => describe(g))].join("\n");
    }
  }

  // 4. Overview: counts plus anything that isn't normal
  const flooding = gauges.filter((g) => g.risk === "flooding");
  const watch = gauges.filter((g) => g.risk === "watch");
  const header = q
    ? `No gauge or known area matched "${params.location}". Ask the user for their neighborhood or city. Area overview:`
    : "Live overview of greater Houston:";
  const lines = [
    header,
    `${gauges.length} gauges: ${flooding.length} flooding, ${watch.length} at watch level, ${
      gauges.filter((g) => g.risk === "normal").length
    } normal.`,
    ...[...flooding, ...watch].map((g) => describe(g)),
  ];
  if (!flooding.length && !watch.length) lines.push("No gauges are at watch or flood level right now.");
  if (userLocation && !q) lines.push("", nearestTo(userLocation, "the user's current location"));
  return lines.join("\n");
}