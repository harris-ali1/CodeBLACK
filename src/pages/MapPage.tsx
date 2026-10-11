import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BellRing, History, Keyboard, Loader2, LocateFixed, Lock, Mic, Pause, Play, Radio } from "lucide-react";
import VoiceAgent from "@/components/voice-agent";
import ChatAgent from "@/components/chat-agent";
import { HOUSTON } from "@/lib/mock-data";
import { LIVE_RISK_COLOR, sortByDistance, sortBySeverity, timeAgo, useGauges, type Gauge } from "@/lib/gauges";
import { gaugesAtHour, replayTimeLabel, useBerylReplay } from "@/lib/beryl";
import { useFloodAlarm } from "@/components/flood-alarm";
import { useLocation } from "@/lib/use-location";
import { cn } from "@/lib/utils";
import { TILES, useMapTheme } from "@/lib/use-map-theme";
import { useAuth } from "@/components/auth-provider";

// Guests (not signed in) get text chat only, with this many questions
const GUEST_QUESTION_LIMIT = 2;

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
  const { user } = useAuth();
  const isGuest = !user;
  const mapTheme = useMapTheme();
  const { gauges: liveGauges, loading, error, updatedAt } = useGauges();
  const location = useLocation();
  const { prefs, prefsReady, testAlarm } = useFloodAlarm();
  const navigate = useNavigate();
  const householdNotes = prefs.dependents.trim() || undefined; // read by the ElevenLabs agent prompt
  // Test alarm needs a home address and a phone number; if either is missing, send them to Profile to add it.
  // Guests have no profile, so they go to sign in.
  const onTestAlarm = () => {
    if (isGuest) {
      toast.info("Sign in to test alerts.");
      navigate("/auth", { state: { from: "/map" } });
      return;
    }
    if (!prefsReady) return; // settings still loading
    const missing = [!prefs.address.trim() && "home address", !prefs.phone && "phone number"].filter(Boolean);
    if (missing.length > 0) {
      toast.info(`Add your ${missing.join(" and ")} to test alerts.`);
      navigate("/profile");
      return;
    }
    testAlarm();
  };

  const [focusId, setFocusId] = useState<string | null>(null);
  const [chosenMode, setMode] = useState<"talk" | "type">("talk");
  const mode = isGuest ? "type" : chosenMode; // voice is for signed-in users only
  const [replay, setReplay] = useState(false);
  const [hour, setHour] = useState(0); // 0–47 hours into the Beryl replay
  const [playing, setPlaying] = useState(false);
  const beryl = useBerylReplay(replay);

  // Step through the replay one hour at a time, stopping at the end
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setHour((h) => {
        if (h >= 47) {
          setPlaying(false);
          return h;
        }
        return h + 1;
      });
    }, 600);
    return () => clearInterval(id);
  }, [playing]);

  // Live NOAA gauges, or the Beryl gauges as they were at the chosen hour
  const gauges: Gauge[] = replay ? (beryl.data ? gaugesAtHour(beryl.data, hour) : []) : liveGauges;
  const sorted: (Gauge & { distanceMi?: number })[] = location.coords
    ? sortByDistance(gauges, location.coords)
    : sortBySeverity(gauges);
  const replayLabel = beryl.data ? replayTimeLabel(beryl.data, hour) : "";

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="relative">
        <MapContainer center={HOUSTON} zoom={10} className="h-full w-full bg-navy-900!" zoomControl={false}>
          {/* Light basemap by day, dark by night (switches at Houston sunrise/sunset) */}
          <TileLayer
            key={mapTheme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url={TILES[mapTheme]}
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
                  pathOptions={{ color: "#25b5d8", weight: 1, fillOpacity: 0.08 }}
                />
              )}
              <CircleMarker
                center={location.coords}
                radius={7}
                pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#16808f", fillOpacity: 1 }}
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
              pathOptions={{
                color: LIVE_RISK_COLOR[g.risk],
                fillColor: LIVE_RISK_COLOR[g.risk],
                fillOpacity: g.risk === "watch" ? 0.3 : 0.5,
                dashArray: g.risk === "watch" ? "4 4" : undefined,
              }}
            >
              <Popup>
                <strong>{g.name}</strong>
                <br />
                {g.levelFt !== null ? `${g.levelFt} ft` : "No current reading"}
                {g.floodStageFt !== null && ` · flood stage ${g.floodStageFt} ft`}
                <br />
                <span style={{ opacity: 0.7 }}>{replay ? replayLabel : `Updated ${timeAgo(g.observedAt)}`}</span>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Live / Replay toggle */}
        <div className="absolute left-4 top-4 z-[500] flex flex-col gap-3 rounded-2xl border border-navy-800 bg-navy-950/90 p-3 backdrop-blur">
          <div className="flex rounded-xl bg-navy-900 p-1 text-sm">
            <button
              onClick={() => {
                setReplay(false);
                setPlaying(false);
              }}
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
          {!replay && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-navy-400">
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading live gauges…
                </>
              ) : error ? (
                <span className="text-alert-300">Live data unavailable</span>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-alert-500" />
                  {gauges.length} NWS gauges · updated {updatedAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </>
              )}
            </p>
          )}
          {replay && (
            <div className="flex w-64 flex-col gap-2 text-xs text-navy-400">
              {beryl.loading || (!beryl.data && !beryl.error) ? (
                <p className="flex items-center gap-1.5 px-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading Hurricane Beryl data…
                </p>
              ) : beryl.error ? (
                <p className="px-1 text-alert-300">Beryl data unavailable</p>
              ) : (
                <>
                  <p className="px-1 text-sm font-semibold text-white">{replayLabel}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!playing && hour >= 47) setHour(0);
                        setPlaying((p) => !p);
                      }}
                      aria-label={playing ? "Pause replay" : "Play replay"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-navy-950 hover:bg-cyan-300"
                    >
                      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={47}
                      value={hour}
                      onChange={(e) => {
                        setPlaying(false);
                        setHour(+e.target.value);
                      }}
                      aria-label="Hours into Hurricane Beryl"
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <p className="px-1">
                    Hour {hour} of 48 ·{" "}
                    <span className="text-alert-300">{gauges.filter((g) => g.risk === "flooding").length} flooding</span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* My location */}
        <button
          onClick={location.status === "on" ? location.stop : location.start}
          className={cn(
            "absolute right-4 top-4 z-[500] flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur transition-colors",
            location.status === "on"
              ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
              : "border-navy-800 bg-navy-950/90 text-navy-300 hover:text-white",
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

        {/* Test the flood alarm (sample alarm, shelters and, if call alerts are on, a test call) */}
        <button
          onClick={onTestAlarm}
          disabled={!isGuest && !prefsReady}
          className="absolute right-4 top-16 z-[500] flex items-center gap-2 rounded-xl border border-navy-800 bg-navy-950/90 px-3 py-2 text-sm text-navy-300 backdrop-blur transition-colors hover:text-white disabled:opacity-60"
        >
          <BellRing className="h-4 w-4" /> Test alarm
        </button>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[500] flex gap-3 rounded-xl border border-navy-800 bg-navy-950/90 px-3 py-2 text-xs text-navy-300">
          {(["normal", "watch", "flooding", "unknown"] as const).map((r) => (
            <span key={r} className="flex items-center gap-1.5 capitalize">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LIVE_RISK_COLOR[r] }} />
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Side panel: voice agent + gauge list */}
      <aside className="flex flex-col gap-6 overflow-y-auto border-l border-navy-800 bg-navy-950 p-6">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-navy-800 bg-navy-900 p-6 text-center">
          <h2 className="text-lg font-semibold text-white">Ask FloodLine</h2>
          <div className="mt-1 flex rounded-xl bg-navy-950 p-1 text-sm">
            {([
              ["talk", Mic, "Talk"],
              ["type", Keyboard, "Type"],
            ] as const).map(([m, Icon, label]) =>
              isGuest && m === "talk" ? (
                // Voice is locked for guests: clicking it goes to sign in
                <Link
                  key={m}
                  to="/auth"
                  state={{ from: "/map" }}
                  title="Sign in to talk to FloodLine"
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-navy-500 transition-colors hover:text-white"
                >
                  <Lock className="h-3.5 w-3.5" /> {label}
                </Link>
              ) : (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition-colors",
                    mode === m ? "bg-teal-600 text-white" : "text-navy-400 hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ),
            )}
          </div>
          {mode === "talk" ? (
            <>
              <p className="mt-2 text-sm text-navy-400">"Is my street flooding?" · "¿Debo salir de casa?"</p>
              <VoiceAgent className="mt-4" onFocusGauge={setFocusId} householdNotes={householdNotes} />
            </>
          ) : (
            <ChatAgent
              className="mt-3"
              onFocusGauge={setFocusId}
              householdNotes={householdNotes}
              guestLimit={isGuest ? GUEST_QUESTION_LIMIT : undefined}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-navy-500">
            {replay ? "Beryl gauges" : "Live gauges"} {gauges.length > 0 && `(${gauges.length})`}
            {location.coords && <span className="normal-case tracking-normal text-cyan-400"> · nearest first</span>}
          </h3>
          {sorted.map((g) => (
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
                <p className="text-xs text-navy-500">
                  {g.levelFt !== null ? `${g.levelFt} ft` : "No reading"}
                  {g.floodStageFt !== null && ` / flood ${g.floodStageFt} ft`} · {replay ? "Beryl replay" : timeAgo(g.observedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-2">
                {g.distanceMi !== undefined && (
                  <span className="text-xs text-navy-400">{g.distanceMi.toFixed(1)} mi</span>
                )}
                <span
                  className="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase"
                  style={
                    g.risk === "flooding"
                      ? { background: LIVE_RISK_COLOR.flooding, borderColor: LIVE_RISK_COLOR.flooding, color: "#0b1128" }
                      : {
                          borderColor: LIVE_RISK_COLOR[g.risk],
                          color: LIVE_RISK_COLOR[g.risk],
                          borderStyle: g.risk === "watch" ? "dashed" : "solid",
                        }
                  }
                >
                  {g.risk}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}