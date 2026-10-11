// Live browser location. Only starts when the user asks (so the permission
// prompt appears on a click), then follows them as they move.
import { useCallback, useEffect, useRef, useState } from "react";
import { setUserLocation } from "@/lib/voice-tools";

export type LocationStatus = "off" | "locating" | "on" | "denied" | "unavailable";

export function useLocation() {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>("off");
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setCoords(null);
    setUserLocation(null);
    setStatus("off");
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCoords(c);
        setAccuracyM(pos.coords.accuracy);
        setUserLocation(c); // lets the agents answer "is it flooding near me?"
        setStatus("on");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  }, []);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setUserLocation(null);
  }, []);

  return { coords, accuracyM, status, start, stop };
}