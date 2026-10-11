// Serves the Hurricane Beryl replay from TigerData (TimescaleDB).
// Runs inside the Vite dev/preview server (see vite.config.ts), so the database
// connection string stays on the server and is never sent to the browser.
import pg from "pg";

// 48-hour demo window: calm → flooding begins ~4 AM Jul 8 → peak ~10 AM → recovery
export const REPLAY_START = "2024-07-07T18:00:00-05:00"; // CDT
export const REPLAY_HOURS = 48;

let pool;
let cached;

export async function loadReplay(databaseUrl) {
  if (cached) return cached; // history never changes, so cache it for the life of the server
  pool ??= new pg.Pool({
    connectionString: databaseUrl.replace(/[?]sslmode=[a-z-]+/, ""),
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  const gauges = await pool.query(
    "select lid, name, lat, lon, flood_stage_ft, action_stage_ft from beryl_gauges order by lid",
  );
  // One reading per gauge per hour (the one at the top of the hour), via TimescaleDB time_bucket/first
  const series = await pool.query(
    `select lid, time_bucket('1 hour', time) as hr, first(stage_ft, time) as stage
       from beryl_readings
      where time >= $1::timestamptz and time < $1::timestamptz + make_interval(hours => $2)
      group by lid, hr`,
    [REPLAY_START, REPLAY_HOURS],
  );

  const startMs = new Date(REPLAY_START).getTime();
  const stages = new Map(gauges.rows.map((g) => [g.lid, Array(REPLAY_HOURS).fill(null)]));
  for (const r of series.rows) {
    const i = Math.round((new Date(r.hr).getTime() - startMs) / 3_600_000);
    if (i >= 0 && i < REPLAY_HOURS) stages.get(r.lid)[i] = r.stage;
  }
  // Fill any gaps with the last known reading
  for (const arr of stages.values()) {
    for (let i = 1; i < arr.length; i++) if (arr[i] === null) arr[i] = arr[i - 1];
  }

  cached = {
    start: new Date(REPLAY_START).toISOString(),
    hours: REPLAY_HOURS,
    gauges: gauges.rows
      .filter((g) => stages.get(g.lid).some((s) => s !== null))
      .map((g) => ({
        id: g.lid,
        name: g.name,
        lat: g.lat,
        lon: g.lon,
        floodStageFt: g.flood_stage_ft,
        actionStageFt: g.action_stage_ft,
        stages: stages.get(g.lid),
      })),
  };
  return cached;
}

// Connect-style middleware: GET /api/beryl/replay
export function berylMiddleware(databaseUrl) {
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (!databaseUrl) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: "DATABASE_URL is not set on the server" }));
      return;
    }
    try {
      res.end(JSON.stringify(await loadReplay(databaseUrl)));
    } catch (err) {
      console.error("[beryl] replay query failed:", err.message);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Could not load Beryl replay" }));
    }
  };
}
