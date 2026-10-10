// Data the voice agent can look up through client tools.
// Uses mock gauges for now; swap the body of fetchGauges() for a call to the
// FastAPI backend once it's ready. Nothing else needs to change.
import { MOCK_GAUGES, type Gauge } from "@/lib/mock-data";

async function fetchGauges(): Promise<Gauge[]> {
  // Later: return (await fetch(`${import.meta.env.VITE_API_URL}/gauges`)).json();
  return MOCK_GAUGES;
}

function describe(g: Gauge) {
  const diff = +(g.levelFt - g.floodStageFt).toFixed(1);
  const vsStage =
    diff >= 0 ? `${diff} ft ABOVE flood stage` : `${Math.abs(diff)} ft below flood stage`;
  return `${g.name} (id ${g.id}, ${g.watershed}): ${g.levelFt} ft, ${vsStage}, status ${g.risk.toUpperCase()}`;
}

/** Tool: get_flood_status({ location? }) */
export async function getFloodStatus(params: { location?: string }): Promise<string> {
  const gauges = await fetchGauges();
  const q = (params.location || "").toLowerCase().trim();

  const matches = q
    ? gauges.filter((g) =>
        q.split(/\s+/).some((word) => word.length > 2 && `${g.name} ${g.watershed}`.toLowerCase().includes(word)),
      )
    : [];

  const list = matches.length ? matches : gauges;
  const header = matches.length
    ? `Gauges matching "${params.location}":`
    : q
      ? `No gauge matched "${params.location}". All Houston gauges:`
      : "All Houston gauges:";

  return [header, ...list.map(describe)].join("\n");
}