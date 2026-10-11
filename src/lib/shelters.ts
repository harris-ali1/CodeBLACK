// Where to go during a flood.
//
// 1. Live: FEMA's National Shelter System feed of shelters that are open right now.
// 2. Fallback: Houston venues that have served as flood shelters in past storms. These are
//    NOT confirmed open, so the UI says to call 211 / check the Red Cross first.
import { milesBetween } from "@/lib/gauges";
import { HOUSTON } from "@/lib/mock-data";

export interface Shelter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceMi: number;
  source: "live" | "known";
}

export interface ShelterResult {
  shelters: Shelter[];
  /** true = confirmed open per FEMA; false = past-storm venues, not confirmed open */
  live: boolean;
}

// Coordinates checked against OpenStreetMap
const KNOWN_VENUES = [
  { id: "grb", name: "George R. Brown Convention Center", address: "1001 Avenida de las Americas, Houston, TX 77010", lat: 29.75179, lon: -95.35811 },
  { id: "nrg", name: "NRG Center", address: "1 NRG Pkwy, Houston, TX 77054", lat: 29.6878, lon: -95.40634 },
  { id: "lakewood", name: "Lakewood Church", address: "3700 Southwest Fwy, Houston, TX 77027", lat: 29.73036, lon: -95.43471 },
  { id: "toyota", name: "Toyota Center", address: "1510 Polk St, Houston, TX 77002", lat: 29.75074, lon: -95.36223 },
];

const FEMA =
  "https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query";

function byDistance(from: [number, number], list: Omit<Shelter, "distanceMi">[]): Shelter[] {
  return list
    .map((s) => ({ ...s, distanceMi: milesBetween(from, [s.lat, s.lon]) }))
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

async function fetchLive(from: [number, number]): Promise<Shelter[]> {
  const [lat, lon] = from;
  const envelope = [lon - 1.2, lat - 0.9, lon + 1.2, lat + 0.9].join(","); // roughly 80 miles around
  const qs = new URLSearchParams({
    where: "shelter_status='OPEN'",
    geometry: envelope,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "shelter_id,shelter_name,address,city,state,zip",
    returnGeometry: "true",
    outSR: "4326",
    f: "json",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${FEMA}?${qs}`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { attributes: Record<string, string | number | null>; geometry?: { x: number; y: number } }[];
    };
    return byDistance(
      from,
      (data.features ?? [])
        .filter((f) => f.geometry)
        .map((f) => ({
          id: `fema-${f.attributes.shelter_id}`,
          name: String(f.attributes.shelter_name ?? "Shelter"),
          address: [f.attributes.address, f.attributes.city, f.attributes.state, f.attributes.zip]
            .filter(Boolean)
            .join(", "),
          lat: f.geometry!.y,
          lon: f.geometry!.x,
          source: "live" as const,
        })),
    );
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Nearest shelters to a point (defaults to Houston), live ones if FEMA lists any open nearby. */
export async function findShelters(from: [number, number] = HOUSTON, max = 3): Promise<ShelterResult> {
  const live = await fetchLive(from);
  if (live.length > 0) return { shelters: live.slice(0, max), live: true };
  return {
    shelters: byDistance(from, KNOWN_VENUES.map((v) => ({ ...v, source: "known" as const }))).slice(0, max),
    live: false,
  };
}

export const directionsUrl = (s: Pick<Shelter, "lat" | "lon">) =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
