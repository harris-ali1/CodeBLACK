import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDots } from "@/components/ui/form-dots";
import { Globe } from "@/components/ui/globe";
import { HOUSTON } from "@/lib/mock-data";

const ease = [0.25, 0.1, 0.25, 1] as const;
const HOUSTON_ONLY = ["houston"];
const HOUSTON_MARKER = [{ coords: HOUSTON }];

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/10";
const labelClass = "text-xs font-semibold uppercase tracking-widest text-zinc-500";

export default function Profile() {
  return (
    <section className="relative overflow-hidden py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-400">
            Your account
          </span>
          <h1 className="text-4xl font-bold text-white md:text-5xl">Edit your profile</h1>
          <p className="max-w-md text-zinc-400">
            Add your details to get flood alerts for your area.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* Left: globe */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease }}
            className="flex flex-col gap-6"
          >
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
              <h2 className="mb-0.5 text-lg font-semibold text-white">Account details</h2>
              <p className="text-sm text-zinc-400">We’ll use these to tailor your alerts.</p>
            </div>

            <FormDots />

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Email</label>
              <input type="email" placeholder="maria@example.com" className={inputClass} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Home address</label>
              <input type="text" placeholder="5600 Braeswood Blvd, Houston, TX 77096" className={inputClass} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Phone number</label>
              <input type="tel" placeholder="(713) 555-0123" className={inputClass} />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-300">
              <input type="checkbox" className="h-4 w-4 accent-sky-400" />
              Send me flood alerts by phone call
            </label>

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" className="group h-11 rounded-xl bg-white px-8 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                Save profile
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <button type="button" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                Change password
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
