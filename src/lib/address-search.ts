// Address autocomplete + geocoding for the profile form.
//
// - Suggestions as you type: Photon (komoot.io), built on OpenStreetMap. Free, no key, allows browser requests.
//   OpenStreetMap is thin on some residential house numbers, so users can always type their own address.
// - Confirming a typed address: the US Census geocoder (TIGER address data), through the /census proxy in
//   vite.config.ts because Census doesn't allow browser requests directly.
import { HOUSTON } from "@/lib/mock-data";

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

const HOUSTON_AREA = "-96.3,29.0,-94.4,30.6"; // minLon,minLat,maxLon,maxLat

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    housenumber?: string;
    street?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
  };
}

/** Street addresses matching what the user has typed, nearest to Houston first. */
export async function suggestAddresses(query: string, signal?: AbortSignal): Promise<Place[]> {
  const qs = new URLSearchParams({
    q: query,
    limit: "10",
    lang: "en",
    lat: String(HOUSTON[0]),
    lon: String(HOUSTON[1]),
    bbox: HOUSTON_AREA,
  });
  const res = await fetch(`https://photon.komoot.io/api/?${qs}`, { signal });
  if (!res.ok) return [];
  const { features } = (await res.json()) as { features: PhotonFeature[] };

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const f of features) {
    const p = f.properties;
    if (!p.housenumber || !p.street) continue; // only real street addresses, not streets or businesses by name
    const state = p.state === "Texas" ? "TX" : p.state;
    const label = [`${p.housenumber} ${p.street}`, p.city ?? p.district, [state, p.postcode].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    if (seen.has(label)) continue; // several businesses can share one address
    seen.add(label);
    places.push({ label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] });
  }
  return places.slice(0, 6);
}

export type Geocode =
  | { status: "found"; lat: number; lon: number }
  | { status: "none" } // the geocoder answered and there is no such address
  | { status: "error" }; // couldn't reach the geocoder (don't block the user over this)

export async function geocodeAddress(address: string): Promise<Geocode> {
  try {
    const qs = new URLSearchParams({ address, benchmark: "Public_AR_Current", format: "json" });
    const res = await fetch(`/census/locations/onelineaddress?${qs}`);
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as {
      result?: { addressMatches?: { coordinates: { x: number; y: number } }[] };
    };
    const match = data.result?.addressMatches?.[0];
    return match ? { status: "found", lat: match.coordinates.y, lon: match.coordinates.x } : { status: "none" };
  } catch {
    return { status: "error" };
  }
}
