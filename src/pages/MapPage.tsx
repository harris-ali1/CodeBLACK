import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { History, Radio } from "lucide-react";
import VoiceAgent from "@/components/voice-agent";
import { HOUSTON, MOCK_GAUGES, RISK_COLOR } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TILES, useMapTheme } from "@/lib/use-map-theme";

// Smoothly pans the map when the voice agent focuses a gauge
function FlyToGauge({ gaugeId }: { gaugeId: string | null }) {
  const map = useMap();
  useEffect(() => {
    const g = MOCK_GAUGES.find((x) => x.id === gaugeId);
    if (g) map.flyTo([g.lat, g.lon], 13, { duration: 1.5 });
  }, [gaugeId, map]);
  return null;
}

export default function MapPage() {
  const mapTheme = useMapTheme();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [replay, setReplay] = useState(false);
  const [hour, setHour] = useState(0); // 0–47 hours into the Beryl replay

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="relative">
        <MapContainer center={HOUSTON} zoom={11} className="h-full w-full bg-navy-900!" zoomControl={false}>
          {/* Light basemap by day, dark by night (switches at Houston sunrise/sunset) */}
          <TileLayer
            key={mapTheme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url={TILES[mapTheme]}
            maxZoom={18}
          />
          <FlyToGauge gaugeId={focusId} />
          {MOCK_GAUGES.map((g) => (
            <CircleMarker
              key={g.id}
              center={[g.lat, g.lon]}
              radius={g.id === focusId ? 18 : 10}
              pathOptions={{
                color: RISK_COLOR[g.risk],
                fillColor: RISK_COLOR[g.risk],
                fillOpacity: g.risk === "watch" ? 0.3 : 0.5,
                dashArray: g.risk === "watch" ? "4 4" : undefined,
              }}
            >
              <Popup>
                <strong>{g.name}</strong>
                <br />
                {g.levelFt} ft (flood stage {g.floodStageFt} ft)
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Live / Replay toggle */}
        <div className="absolute left-4 top-4 z-[500] flex flex-col gap-3 rounded-2xl border border-navy-800 bg-navy-950/90 p-3 backdrop-blur">
          <div className="flex rounded-xl bg-navy-900 p-1 text-sm">
            <button
              onClick={() => setReplay(false)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5", !replay ? "bg-teal-600 text-white" : "text-navy-400")}
            >
              <Radio className="h-3.5 w-3.5" /> Live
            </button>
            <button
              onClick={() => setReplay(true)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5", replay ? "bg-teal-600 text-white" : "text-navy-400")}
            >
              <History className="h-3.5 w-3.5" /> Replay Beryl
            </button>
          </div>
          {replay && (
            <label className="flex flex-col gap-1 text-xs text-navy-400">
              Hour {hour} of 48 · Jul 8, 2024
              <input
                type="range"
                min={0}
                max={47}
                value={hour}
                onChange={(e) => setHour(+e.target.value)}
                className="accent-cyan-400"
              />
            </label>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[500] flex gap-3 rounded-xl border border-navy-800 bg-navy-950/90 px-3 py-2 text-xs text-navy-300">
          {(["normal", "watch", "flooding"] as const).map((r) => (
            <span key={r} className="flex items-center gap-1.5 capitalize">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLOR[r] }} />
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Side panel: voice agent + gauge list */}
      <aside className="flex flex-col gap-6 overflow-y-auto border-l border-navy-800 bg-navy-950 p-6">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-navy-800 bg-navy-900 p-6 text-center">
          <h2 className="text-lg font-semibold text-white">Ask FloodLine</h2>
          <p className="text-sm text-navy-400">"Is my street flooding?" · "¿Debo salir de casa?"</p>
          <VoiceAgent className="mt-4" onFocusGauge={setFocusId} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-navy-500">Gauges</h3>
          {MOCK_GAUGES.map((g) => (
            <button
              key={g.id}
              onClick={() => setFocusId(g.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                g.id === focusId
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : g.risk === "flooding"
                    ? "border-alert-500 bg-alert-500/15"
                    : "border-navy-800 bg-navy-900/60 hover:border-navy-700",
              )}
            >
              <div>
                <p className="text-sm text-navy-200">{g.name}</p>
                <p className="text-xs text-navy-500">{g.levelFt} ft / {g.floodStageFt} ft</p>
              </div>
              <span
                className="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase"
                style={
                  g.risk === "flooding"
                    ? { background: RISK_COLOR.flooding, borderColor: RISK_COLOR.flooding, color: "#0b1128" }
                    : { borderColor: RISK_COLOR[g.risk], color: RISK_COLOR[g.risk], borderStyle: g.risk === "watch" ? "dashed" : "solid" }
                }
              >
                {g.risk}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}