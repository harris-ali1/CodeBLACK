import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormDots } from "@/components/ui/form-dots";
import { AddressInput } from "@/components/address-input";
import { ALERT_RADIUS_MI, useFloodAlarm } from "@/components/flood-alarm";
import { useAuth } from "@/components/auth-provider";
import { geocodeAddress, type Place } from "@/lib/address-search";
import { formatPhone, toE164 } from "@/lib/phone";
import { supabase } from "@/lib/supabase";

const ease = [0.25, 0.1, 0.25, 1] as const;

const inputClass =
  "w-full rounded-xl border border-navy-700 bg-navy-800/60 px-4 py-2.5 text-sm text-navy-200 placeholder:text-navy-600 outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10";
const labelClass = "text-xs font-semibold uppercase tracking-widest text-navy-500";

// Postgres / PostgREST codes for "that column doesn't exist" (the phone migration hasn't been run yet)
const isMissingColumn = (e: { code?: string; message?: string }) =>
  e.code === "42703" || e.code === "PGRST204" || /phone|call_consent|dependents|address_lat|address_lon/.test(e.message ?? "");

export default function Profile() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { reloadPrefs } = useFloodAlarm();

  // Form state
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState("en");
  const [address, setAddress] = useState("");
  // Coordinates for the address: from a picked suggestion, the saved profile, or looked up when saving
  const [home, setHome] = useState<{ label: string; lat: number; lon: number } | null>(null);
  const [phone, setPhone] = useState("");
  const [callConsent, setCallConsent] = useState(false);
  const [dependents, setDependents] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the form with anything the user saved before
  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const metaName =
      typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";

    const load = async () => {
      let res = await client
        .from("profiles")
        .select("full_name, language, address, phone, call_consent, dependents, address_lat, address_lon")
        .eq("id", user.id)
        .maybeSingle();
      // Database without the phone columns yet: load the rest
      if (res.error && isMissingColumn(res.error)) {
        res = (await client
          .from("profiles")
          .select("full_name, language, address")
          .eq("id", user.id)
          .maybeSingle()) as typeof res;
      }
      const data = res.data;
      setFullName(data?.full_name ?? metaName);
      if (data?.language) setLanguage(data.language);
      if (data?.address) {
        setAddress(data.address);
        if (data.address_lat != null && data.address_lon != null)
          setHome({ label: data.address, lat: data.address_lat, lon: data.address_lon });
      }
      if (data?.phone) setPhone(formatPhone(data.phone));
      if (data?.call_consent) setCallConsent(true);
      if (data?.dependents) setDependents(data.dependents);
    };
    void load();
  }, [user]);

  // Save to Supabase → show notification → go to the map
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (!supabase) {
      setError("Supabase isn't configured. Check .env.local.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter your home address so we know which gauges to watch.");
      return;
    }
    const e164 = phone.trim() ? toE164(phone) : null;
    if (phone.trim() && !e164) {
      setError("Enter a 10-digit US phone number, like (713) 555-0123.");
      return;
    }
    if (callConsent && !e164) {
      setError("Add your phone number so we can call you.");
      return;
    }

    setSaving(true);
    setError(null);

    // Work out where the home is. A picked/saved address that hasn't been edited already has coordinates;
    // otherwise confirm what was typed with the Census geocoder.
    const text = address.trim();
    let coords = home && home.label === text ? { lat: home.lat, lon: home.lon } : null;
    if (!coords) {
      const g = await geocodeAddress(text);
      if (g.status === "none") {
        setSaving(false);
        setError("We couldn't find that address. Check the street number and spelling, or pick one from the suggestions.");
        return;
      }
      if (g.status === "found") coords = { lat: g.lat, lon: g.lon };
      // "error" (geocoder unreachable): save anyway, without coordinates
    }

    const base = { id: user.id, full_name: fullName.trim(), language, address: text };
    let { error } = await supabase.from("profiles").upsert({
      ...base,
      phone: e164,
      call_consent: callConsent,
      dependents: dependents.trim() || null,
      address_lat: coords?.lat ?? null,
      address_lon: coords?.lon ?? null,
    });

    // The database doesn't have the phone columns yet: still save everything else
    let phoneSkipped = false;
    if (error && isMissingColumn(error)) {
      phoneSkipped = true;
      ({ error } = await supabase.from("profiles").upsert(base));
    }

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    reloadPrefs();
    if (phoneSkipped) {
      toast.warning("Saved, but phone and dependents need the database update first (see the new migration).");
    } else {
      toast.success("Alerts activated!");
    }
    navigate("/map");
  };

  if (loading) return <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-navy-400">Loading your profile…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;

  const displayName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "FloodLine member";

  return (
    <section className="relative overflow-hidden py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400">
            Your household
          </span>
          <h1 className="text-4xl font-bold text-white md:text-5xl">Set up your alerts</h1>
          <p className="max-w-md text-navy-400">
            Signed in as {displayName} · {user.email}. Your address picks which gauges to watch.
          </p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="mx-auto flex max-w-xl flex-col gap-5 rounded-2xl border border-navy-800 bg-navy-900 p-6 sm:p-8"
        >
          <div>
            <h2 className="mb-0.5 text-lg font-semibold text-white">Your details</h2>
            <p className="text-sm text-navy-400">Private to you. We only use this to send your alerts.</p>
          </div>

          <FormDots />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="full-name" className={labelClass}>Full name</label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maria Lopez"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="language" className={labelClass}>Language</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="address" className={labelClass}>Home address</label>
            <AddressInput
              id="address"
              value={address}
              onChange={setAddress}
              onPick={(p: Place) => setHome(p)}
              placeholder="Start typing your street address"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className={labelClass}>Phone number</label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(713) 555-0123"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="dependents" className={labelClass}>Who are you looking after?</label>
            <textarea
              id="dependents"
              rows={3}
              value={dependents}
              onChange={(e) => setDependents(e.target.value)}
              placeholder="e.g. My elderly mother, two kids (3 and 6), and a dog. Mom uses a walker."
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-navy-500">
              Optional. We use this to tailor your alerts and our assistant's advice, for example when to leave early.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy-700 bg-navy-800/60 p-4 text-sm">
            <input
              type="checkbox"
              checked={callConsent}
              onChange={(e) => setCallConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400"
            />
            <span>
              <span className="block font-semibold text-white">Allow FloodLine to call me with flood alerts</span>
              <span className="mt-1 block leading-relaxed text-navy-400">
                If a gauge within {ALERT_RADIUS_MI} miles starts flooding, an automated call using an AI voice will
                read you the warning, in your language. We only call for flood warnings, and you can turn this off here any time.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-alert-300">{error}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="group h-11 w-fit rounded-xl bg-cyan-400 px-8 text-sm font-bold text-navy-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save and start alerts"}
            {!saving && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
