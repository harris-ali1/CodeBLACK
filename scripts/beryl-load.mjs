// Loads Hurricane Beryl (Jul 2024) gauge readings into TigerData (TimescaleDB).
//
//   DATABASE_URL='postgres://...' npm run beryl:load
//
// Gauge list, coordinates and flood stages come from NOAA's NWPS API; the 15-minute
// stage readings come from USGS. The connection string is read from the environment only.
import pg from "pg";

const DB = process.env.DATABASE_URL;
if (!DB) throw new Error("Set DATABASE_URL to your TigerData connection string.");

const NWPS = "https://api.water.noaa.gov/nwps/v1";
const BBOX = "bbox.xmin=-96.0&bbox.ymin=29.4&bbox.xmax=-94.9&bbox.ymax=30.4&srid=EPSG_4326"; // greater Houston, same as the live map
const START = "2024-07-07T00:00:00-05:00"; // CDT
const END = "2024-07-10T00:00:00-05:00";

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// 1. Gauges with a USGS id and a flood stage
const list = (await getJson(`${NWPS}/gauges?${BBOX}`)).gauges;
const gauges = [];
for (let i = 0; i < list.length; i += 8) {
  const batch = await Promise.all(
    list.slice(i, i + 8).map((g) => getJson(`${NWPS}/gauges/${g.lid}`).catch(() => null)),
  );
  for (const d of batch) {
    const minor = d?.flood?.categories?.minor?.stage;
    if (d?.usgsId && minor > 0) {
      gauges.push({
        lid: d.lid,
        usgs_id: d.usgsId,
        name: d.name,
        lat: d.latitude,
        lon: d.longitude,
        flood_stage_ft: minor,
        action_stage_ft: d.flood.categories.action?.stage > 0 ? d.flood.categories.action.stage : null,
      });
    }
  }
}
console.log(`${gauges.length} gauges with a USGS id and flood stage`);

// 2. Beryl readings from USGS (gage height, parameter 00065)
const sites = gauges.map((g) => g.usgs_id).join(",");
const usgs = await getJson(
  `https://nwis.waterservices.usgs.gov/nwis/iv/?format=json&sites=${sites}&parameterCd=00065&startDT=${START}&endDT=${END}&siteStatus=all`,
);
const byUsgs = new Map(gauges.map((g) => [g.usgs_id, g]));
const readings = [];
const withData = new Set();
for (const ts of usgs.value.timeSeries) {
  const g = byUsgs.get(ts.sourceInfo.siteCode[0].value);
  if (!g) continue;
  for (const v of ts.values[0].value) {
    const ft = Number(v.value);
    if (!Number.isFinite(ft) || ft < -100) continue; // -999999 = missing
    readings.push({ time: v.dateTime, lid: g.lid, ft });
    withData.add(g.lid);
  }
}
const loaded = gauges.filter((g) => withData.has(g.lid));
console.log(`${readings.length} readings across ${loaded.length} gauges`);

// 3. Write to TigerData
const client = new pg.Client({
  connectionString: DB.replace(/[?]sslmode=[a-z-]+/, ""),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(`
  create table if not exists beryl_gauges (
    lid text primary key,
    usgs_id text not null,
    name text not null,
    lat double precision not null,
    lon double precision not null,
    flood_stage_ft double precision not null,
    action_stage_ft double precision
  );
  create table if not exists beryl_readings (
    time timestamptz not null,
    lid text not null references beryl_gauges(lid),
    stage_ft double precision not null,
    primary key (lid, time)
  );
`);
await client.query(`select create_hypertable('beryl_readings', 'time', if_not_exists => true, migrate_data => true)`);
await client.query("truncate beryl_readings");
await client.query("delete from beryl_gauges");

await client.query(
  `insert into beryl_gauges select * from unnest($1::text[],$2::text[],$3::text[],$4::float8[],$5::float8[],$6::float8[],$7::float8[])`,
  [
    loaded.map((g) => g.lid),
    loaded.map((g) => g.usgs_id),
    loaded.map((g) => g.name),
    loaded.map((g) => g.lat),
    loaded.map((g) => g.lon),
    loaded.map((g) => g.flood_stage_ft),
    loaded.map((g) => g.action_stage_ft),
  ],
);
for (let i = 0; i < readings.length; i += 5000) {
  const chunk = readings.slice(i, i + 5000);
  await client.query(
    `insert into beryl_readings select * from unnest($1::timestamptz[],$2::text[],$3::float8[]) on conflict do nothing`,
    [chunk.map((r) => r.time), chunk.map((r) => r.lid), chunk.map((r) => r.ft)],
  );
}
const check = await client.query(
  `select count(*) as readings, count(distinct lid) as gauges, min(time) as first, max(time) as last from beryl_readings`,
);
console.log(check.rows[0]);
await client.end();
