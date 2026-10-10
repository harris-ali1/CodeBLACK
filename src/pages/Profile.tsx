import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, MapPin, Languages, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDots } from "@/components/ui/form-dots";
import { Globe } from "@/components/ui/globe";
import { HOUSTON } from "@/lib/mock-data";
import { useAuth } from "@/components/auth-provider";

const ease = [0.25, 0.1, 0.25, 1] as const;
const HOUSTON_ONLY = ["houston"];
const HOUSTON_MARKER = [{ coords: HOUSTON }];

const WHY = [
  { icon: MapPin, label: "Your address tells us which bayou gauges matter to you." },
  { icon: Languages, label: "Alerts are spoken in the language you choose." },
  { icon: HeartHandshake, label: "Household needs help us prioritize who to warn first." },
];

const NEEDS = [
  { id: "elderly", label: "Elderly resident" },
  { id: "no_car", label: "No car" },
  { id: "pets", label: "Pets" },
  { id: "medical", label: "Medical equipment" },
  { id: "mobility", label: "Limited mobility" },
  { id: "children", label: "Young children" },
];

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/10";
const labelClass = "text-xs font-semibold uppercase tracking-widest text-zinc-500";

export default function Profile() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [needs, setNeeds] = useState<string[]>([]);
  const toggle = (id: string) =>
    setNeeds((n) => (n.includes(id) ? n.filter((x) => x !== id) : [...n, id]));

  if (loading) return <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-zinc-400">Loading your profile…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;

  const displayName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "FloodLine member";

  return (
    <section className="relative overflow-hidden py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-400">
            Your household
          </span>
          <h1 className="text-4xl font-bold text-white md:text-5xl">Set up your alerts</h1>
          <p className="max-w-md text-zinc-400">
            Signed in as {displayName} · {user.email}. Set your household details for personal alerts.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* Left: why we ask + globe */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-white">Why we ask</h2>
              <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
                Everything stays private and is only used to personalize your alerts.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {WHY.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm text-zinc-400">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/80">
                    <Icon className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  {label}
                </div>
              ))}
            </div>
            <div className="relative h-52 overflow-hidden text-zinc-500">
              <Globe
                className="absolute left-0 top-0 aspect-square w-full max-w-full"
                variant="wireframesolid"
                strokeWidth={0.6}
                initialRotation={[-200, 0]}
                rotateCities={HOUSTON_ONLY}
                rotationSpeed={5000}
                markers={HOUSTON_MARKER}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-zinc-950 to-transparent" />
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.form
            onSubmit={(e) => e.preventDefault()}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35, ease }}
            className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8"
          >
            <div>
              <h2 className="mb-0.5 text-lg font-semibold text-white">Household details</h2>
              <p className="text-sm text-zinc-400">We'll use these to tailor every alert.</p>
            </div>

            <FormDots />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Full name</label>
                <input type="text" defaultValue={displayName === "FloodLine member" ? "" : displayName} placeholder="Maria Lopez" className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Language</label>
                <select className={inputClass} defaultValue="en">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Home address</label>
              <input type="text" placeholder="5600 Braeswood Blvd, Houston, TX 77096" className={inputClass} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Household needs</label>
              <div className="grid grid-cols-2 gap-2">
                {NEEDS.map(({ id, label }) => {
                  const on = needs.includes(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => toggle(id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        on
                          ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
                          : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="group h-11 w-fit rounded-xl bg-white px-8 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
              Save and start alerts
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
