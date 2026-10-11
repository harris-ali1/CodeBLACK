// Flood alarm: when a gauge within ALERT_RADIUS_MI of the user reaches flooding we show a
// banner and play a siren. The warning is tailored to the user's dependents and lists the
// nearest shelters. If the user allowed calls, the ElevenLabs agent also phones them and reads it.
// (Until the server has an ElevenLabs key + Twilio number, the call is only a preview.)
// testAlarm() fires a sample.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BellRing, MapPin, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { buildAlert, type AlertMessage } from "@/lib/alert-message";
import { callsConfigured, placeAlertCall } from "@/lib/call";
import { milesBetween, sortByDistance, useGauges } from "@/lib/gauges";
import { HOUSTON } from "@/lib/mock-data";
import { maskPhone } from "@/lib/phone";
import { directionsUrl, findShelters, type Shelter } from "@/lib/shelters";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/lib/use-location";

export const ALERT_RADIUS_MI = 20;
const SEEN_KEY = "floodline.alarmSeen";

interface Prefs {
  /** saved home address text */
  address: string;
  /** home location saved from the address autocomplete */
  home: [number, number] | null;
  phone: string | null;
  consent: boolean;
  dependents: string;
  language: string;
}

interface Alarm {
  id: string;
  gaugeName: string;
  distanceMi: number;
  test: boolean;
  message: AlertMessage | null;
  shelters: Shelter[];
  sheltersLive: boolean;
  call: "off" | "calling" | "placed" | "failed";
}

interface FloodAlarmApi {
  testAlarm: () => void;
  /** Re-read the saved profile settings (after the profile is saved). */
  reloadPrefs: () => void;
  prefs: Prefs;
  /** the saved settings have finished loading (so "is anything missing?" is trustworthy) */
  prefsReady: boolean;
  /** the server can place real calls (ElevenLabs key + Twilio number are set) */
  callsReady: boolean;
}

const NO_PREFS: Prefs = { address: "", home: null, phone: null, consent: false, dependents: "", language: "en" };

const FloodAlarmContext = createContext<FloodAlarmApi>({
  testAlarm: () => {},
  reloadPrefs: () => {},
  prefs: NO_PREFS,
  prefsReady: false,
  callsReady: false,
});
export const useFloodAlarm = () => useContext(FloodAlarmContext);

// Two-tone siren for a few seconds. Browsers only allow sound after the user has
// interacted with the page, so on a fresh page load it may be silent; the banner still shows.
function startAlarmSound(): () => void {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    void ctx.resume();
    let n = 0;
    const beep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = n++ % 2 ? 880 : 660;
      gain.gain.value = 0.04;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    };
    beep();
    const timer = setInterval(beep, 450);
    const stopTimer = setTimeout(stop, 8000);
    function stop() {
      clearInterval(timer);
      clearTimeout(stopTimer);
      void ctx.close().catch(() => {});
    }
    return stop;
  } catch {
    return () => {};
  }
}

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function FloodAlarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { gauges } = useGauges();
  const loc = useLocation();
  const [prefs, setPrefs] = useState<Prefs>(NO_PREFS);
  const [callsReady, setCallsReady] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const seen = useRef<Set<string>>(readSeen());
  const startedLocation = useRef(false);

  // Load the user's saved settings (the phone/dependents columns may not exist until the migration runs)
  const reloadPrefs = useCallback(() => {
    if (!user || !supabase) return;
    const client = supabase;
    void (async () => {
      let res = await client
        .from("profiles")
        .select("address, phone, call_consent, dependents, language, address_lat, address_lon")
        .eq("id", user.id)
        .maybeSingle();
      if (res.error) {
        res = (await client.from("profiles").select("address, language").eq("id", user.id).maybeSingle()) as typeof res;
      }
      const d = res.data;
      setPrefs({
        address: d?.address ?? "",
        home: d?.address_lat != null && d?.address_lon != null ? [d.address_lat, d.address_lon] : null,
        phone: d?.phone ?? null,
        consent: Boolean(d?.call_consent),
        dependents: d?.dependents ?? "",
        language: d?.language ?? "en",
      });
      setPrefsReady(true);
    })();
  }, [user]);
  useEffect(reloadPrefs, [reloadPrefs]);

  useEffect(() => {
    if (user) void callsConfigured().then(setCallsReady);
  }, [user]);

  // Use the user's location for nearby alarms, but only if they've already allowed it (never prompts)
  const { start: startLocation } = loc;
  useEffect(() => {
    if (!user || startedLocation.current || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted" && !startedLocation.current) {
          startedLocation.current = true;
          startLocation();
        }
      })
      .catch(() => {});
  }, [user, startLocation]);

  // Where "near you" is measured from: the live browser location if allowed, otherwise the saved home address
  const here = loc.coords ?? prefs.home;

  // Flooding gauges within the alert radius, nearest first
  const nearbyFlooding = useMemo(
    () =>
      here
        ? sortByDistance(gauges, here).filter((g) => g.risk === "flooding" && g.distanceMi <= ALERT_RADIUS_MI)
        : [],
    [gauges, here],
  );

  // Latest values for the async raise() below
  const latest = useRef({ prefs, callsReady, coords: here });
  latest.current = { prefs, callsReady, coords: here };

  const raise = useCallback(async (base: { id: string; gaugeName: string; distanceMi: number; test: boolean }) => {
    const first: Alarm = { ...base, message: null, shelters: [], sheltersLive: false, call: "off" };
    setAlarm(first);

    // Find shelters, then write the warning for this household
    const { prefs: p, callsReady: ready, coords } = latest.current;
    // FloodLine covers greater Houston. If the user is far from it (testing from another city), measure from Houston so the
    // shelter distances make sense instead of showing "1,496 mi".
    const origin = coords && milesBetween(coords, HOUSTON) < 100 ? coords : HOUSTON;
    const { shelters, live } = await findShelters(origin);
    const message = buildAlert({
      gaugeName: base.gaugeName,
      distanceMi: base.distanceMi,
      dependents: p.dependents,
      language: p.language,
      shelters,
      sheltersLive: live,
    });
    // Only call people who ticked "Allow FloodLine to call me" (the server checks this again)
    const willCall = ready && p.consent && Boolean(p.phone);
    setAlarm((a) =>
      a?.id === base.id ? { ...a, message, shelters, sheltersLive: live, call: willCall ? "calling" : "off" } : a,
    );

    if (!willCall) return;
    try {
      await placeAlertCall(`${base.test ? message.testIntro : message.intro} ${message.spoken}`);
      setAlarm((a) => (a?.id === base.id ? { ...a, call: "placed" } : a));
    } catch (err) {
      setAlarm((a) => (a?.id === base.id ? { ...a, call: "failed" } : a));
      toast.error(err instanceof Error ? err.message : "Couldn't place the call.");
    }
  }, []);

  // Raise an alarm the first time each gauge is flooding near you this session
  useEffect(() => {
    if (!user) return;
    const fresh = nearbyFlooding.find((g) => !seen.current.has(g.id));
    if (!fresh) return;
    seen.current.add(fresh.id);
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current]));
    } catch {
      /* private mode: alarms may repeat on reload, which is fine */
    }
    void raise({ id: fresh.id, gaugeName: fresh.name, distanceMi: fresh.distanceMi, test: false });
  }, [user, nearbyFlooding, raise]);

  // Sound plays once per alarm
  const alarmId = alarm?.id;
  useEffect(() => {
    if (!alarmId) return;
    return startAlarmSound();
  }, [alarmId]);

  const testAlarm = useCallback(() => {
    const nearest = nearbyFlooding[0];
    void raise({
      id: `test-${Date.now()}`,
      gaugeName: nearest?.name ?? "Brays Bayou at Houston",
      distanceMi: nearest?.distanceMi ?? 12.4,
      test: true,
    });
  }, [nearbyFlooding, raise]);

  const api = useMemo(
    () => ({ testAlarm, reloadPrefs, prefs, prefsReady, callsReady }),
    [testAlarm, reloadPrefs, prefs, prefsReady, callsReady],
  );
  const calling = prefs.consent && prefs.phone;
  const close = () => setAlarm(null);

  return (
    <FloodAlarmContext.Provider value={api}>
      {alarm && (
        <div
          role="alert"
          className="fixed inset-x-0 top-14 z-[1100] max-h-[75vh] overflow-y-auto border-b border-alert-500 bg-alert-500 text-navy-950 shadow-lg"
        >
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 motion-safe:animate-pulse" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">
                {alarm.test && "TEST · "}
                {alarm.message?.headline ?? `Flood alarm: ${alarm.gaugeName} is flooding ${alarm.distanceMi.toFixed(1)} miles from you.`}
              </p>

              {alarm.message && (
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {alarm.message.advice.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}

              {alarm.shelters.length > 0 && (
                <div className="mt-2.5">
                  <p className="flex items-center gap-1.5 font-bold">
                    <MapPin className="h-3.5 w-3.5" />
                    {alarm.sheltersLive ? "Open shelters near you" : "Places that have sheltered people in past floods"}
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {alarm.shelters.map((s) => (
                      <li key={s.id}>
                        <span className="font-semibold">{s.name}</span> · {s.distanceMi.toFixed(1)} mi · {s.address}{" "}
                        <a
                          href={directionsUrl(s)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold underline"
                        >
                          Directions
                        </a>
                      </li>
                    ))}
                  </ul>
                  {!alarm.sheltersLive && (
                    <p className="mt-1 opacity-80">
                      Not confirmed open. Call 211 or check redcross.org before you go.
                    </p>
                  )}
                </div>
              )}

              <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                {calling ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {!callsReady && `Calling ${maskPhone(prefs.phone)}… Preview only, phone calls aren't connected yet.`}
                    {callsReady && alarm.call === "calling" && `Calling ${maskPhone(prefs.phone)}…`}
                    {callsReady && alarm.call === "placed" && `Call placed to ${maskPhone(prefs.phone)}. Pick up to hear it.`}
                    {callsReady && alarm.call === "failed" && `Couldn't place the call to ${maskPhone(prefs.phone)}.`}
                    {callsReady && alarm.call === "off" && `Calling ${maskPhone(prefs.phone)}…`}
                  </span>
                ) : (
                  <span>
                    Want a phone call for alerts like this?{" "}
                    <Link to="/profile" className="font-bold underline" onClick={close}>
                      Turn on call alerts
                    </Link>
                  </span>
                )}
              </p>
            </div>
            <Link
              to="/map"
              onClick={close}
              className="shrink-0 rounded-lg bg-navy-950 px-3 py-1.5 text-sm font-bold text-white hover:bg-navy-900"
            >
              View map
            </Link>
            <button onClick={close} aria-label="Dismiss alarm" className="shrink-0 rounded-lg p-1.5 hover:bg-navy-950/15">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {children}
    </FloodAlarmContext.Provider>
  );
}
