import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { History, Keyboard, Loader2, LocateFixed, Mic, Radio } from "lucide-react";
import VoiceAgent from "@/components/voice-agent";
import ChatAgent from "@/components/chat-agent";
import { HOUSTON } from "@/lib/mock-data";
import { LIVE_RISK_COLOR, sortByDistance, sortBySeverity, timeAgo, useGauges, type Gauge } from "@/lib/gauges";
import { useLocation } from "@/lib/use-location";
import { cn } from "@/lib/utils";

// Smoothly pans the map when the voice agent focuses a gauge
function FlyToGauge({ gaugeId, gauges }: { gaugeId: string | null; gauges: Gauge[] }) {
  const map = useMap();
  useEffect(() => {
    const g = gauges.find((x) => x.id === gaugeId);
    if (g) map.flyTo([g.lat, g.lon], 13, { duration: 1.5 });
  }, [gaugeId, gauges, map]);
  return null;
}

// Flies to the user once, the first time their location comes in
function FlyToUser({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (coords && !done.current) {
      done.current = true;
      map.flyTo(coords, 12, { duration: 1.5 });
    }
    if (!coords) done.current = false;
  }, [coords, map]);
  return null;
}

export default function MapPage() {
  const { gauges, loading, error, updatedAt } = useGauges();
  const location = useLocation();
  const sorted: (Gauge & { distanceMi?: number })[] = location.coords
    ? sortByDistance(gauges, location.coords)
    : sortBySeverity(gauges);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [mode, setMode] = useState<"talk" | "type">("talk");
  const [replay, setReplay] = useState(false);
  const [hour, setHour] = useState(0); // 0–47 hours into the Beryl replay

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="relative">
        <MapContainer center={HOUSTON} zoom={10} className="h-full w-full bg-zinc-900!" zoomControl={false}>
          {/* CARTO dark basemap (OpenStreetMap data) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_4gm9_1_8794dbea55a0f8c75afeece8"
            maxZoom={18}
          />
          <FlyToGauge gaugeId={focusId} gauges={gauges} />
          <FlyToUser coords={location.coords} />
          {location.coords && (
            <>
              {location.accuracyM !== null && location.accuracyM < 3000 && (
                <Circle
                  center={location.coords}
                  radius={location.accuracyM}
                  pathOptions={{ color: "#38bdf8", weight: 1, fillOpacity: 0.08 }}
                />
              )}
              <CircleMarker
                center={location.coords}
                radius={7}
                pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0ea5e9", fillOpacity: 1 }}
              >
                <Popup>You are here</Popup>
              </CircleMarker>
            </>
          )}
          {gauges.map((g) => (
            <CircleMarker
              key={g.id}
              center={[g.lat, g.lon]}
              radius={g.id === focusId ? 16 : 8}
              eventHandlers={{ click: () => setFocusId(g.id) }}
              pathOptions={{ color: LIVE_RISK_COLOR[g.risk], fillColor: LIVE_RISK_COLOR[g.risk], fillOpacity: 0.5 }}
            >
              <Popup>
                <strong>{g.name}</strong>
                <br />
                {g.levelFt !== null ? `${g.levelFt} ft` : "No current reading"}
                {g.floodStageFt !== null && ` · flood stage ${g.floodStageFt} ft`}
                <br />
                <span style={{ opacity: 0.7 }}>Updated {timeAgo(g.observedAt)}</span>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Live / Replay toggle */}
        <div className="absolute left-4 top-4 z-[500] flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3 backdrop-blur">
          <div className="flex rounded-xl bg-zinc-900 p-1 text-sm">
            <button
              onClick={() => setReplay(false)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5", !replay ? "bg-zinc-800 text-white" : "text-zinc-400")}
            >
              <Radio className="h-3.5 w-3.5" /> Live
            </button>
            <button
              onClick={() => setReplay(true)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5", replay ? "bg-zinc-800 text-white" : "text-zinc-400")}
            >
              <History className="h-3.5 w-3.5" /> Replay Beryl
            </button>
          </div>
          {!replay && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-zinc-400">
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading live gauges…
                </>
              ) : error ? (
                <span className="text-red-400">Live data unavailable</span>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  {gauges.length} NWS gauges · updated {updatedAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </>
              )}
            </p>
          )}
          {replay && (
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Hour {hour} of 48 · Jul 8, 2024
              <input
                type="range"
                min={0}
                max={47}
                value={hour}
                onChange={(e) => setHour(+e.target.value)}
                className="accent-sky-400"
              />
            </label>
          )}
        </div>

        {/* My location */}
        <button
          onClick={location.status === "on" ? location.stop : location.start}
          className={cn(
            "absolute right-4 top-4 z-[500] flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur transition-colors",
            location.status === "on"
              ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
              : "border-zinc-800 bg-zinc-950/90 text-zinc-300 hover:text-white",
          )}
        >
          {location.status === "locating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          {location.status === "on"
            ? "Location on"
            : location.status === "locating"
              ? "Finding you…"
              : location.status === "denied"
                ? "Location blocked"
                : location.status === "unavailable"
                  ? "Location unavailable · retry"
                  : "Use my location"}
        </button>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[500] flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-300">
          {(["normal", "watch", "flooding", "unknown"] as const).map((r) => (
            <span key={r} className="flex items-center gap-1.5 capitalize">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LIVE_RISK_COLOR[r] }} />
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Side panel: voice agent + gauge list */}
      <aside className="flex flex-col gap-6 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h2 className="text-lg font-semibold text-white">Ask FloodLine</h2>
          <div className="mt-1 flex rounded-xl bg-zinc-950 p-1 text-sm">
            {([
              ["talk", Mic, "Talk"],
              ["type", Keyboard, "Type"],
            ] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition-colors",
                  mode === m ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          {mode === "talk" ? (
            <>
              <p className="mt-2 text-sm text-zinc-400">"Is my street flooding?" · "¿Debo salir de casa?"</p>
              <VoiceAgent className="mt-4" onFocusGauge={setFocusId} />
            </>
          ) : (
            <ChatAgent className="mt-3" onFocusGauge={setFocusId} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Live gauges {gauges.length > 0 && `(${gauges.length})`}
            {location.coords && <span className="normal-case tracking-normal text-sky-400"> · nearest first</span>}
          </h3>
          {sorted.map((g) => (
            <button
              key={g.id}
              onClick={() => setFocusId(g.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                g.id === focusId ? "border-sky-500/50 bg-sky-500/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700",
              )}
            >
              <div>
                <p className="text-sm text-zinc-200">{g.name}</p>
                <p className="text-xs text-zinc-500">
                  {g.levelFt !== null ? `${g.levelFt} ft` : "No reading"}
                  {g.floodStageFt !== null && ` / flood ${g.floodStageFt} ft`} · {timeAgo(g.observedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-2">
                {g.distanceMi !== undefined && (
                  <span className="text-xs text-zinc-400">{g.distanceMi.toFixed(1)} mi</span>
                )}
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LIVE_RISK_COLOR[g.risk] }} />
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}