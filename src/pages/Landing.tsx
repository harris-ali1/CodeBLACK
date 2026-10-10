import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Globe } from "@/components/ui/globe";
import { Button } from "@/components/ui/button";
import { HOUSTON } from "@/lib/mock-data";

const ease = [0.25, 0.1, 0.25, 1] as const;
const HOUSTON_ONLY = ["houston"];
const HOUSTON_MARKER = [{ coords: HOUSTON, color: "#38bdf8" }];

const COPY = {
  en: {
    badge: "Houston flood alerts",
    title: "Know before the water does.",
    body: "FloodLine watches every bayou gauge in real time and tells you, out loud and in your language, if your street is at risk and what to do next.",
    cta: "Talk to FloodLine",
    secondary: "Open live map",
  },
  es: {
    badge: "Alertas de inundación en Houston",
    title: "Entérate antes que el agua.",
    body: "FloodLine vigila cada medidor de los bayous en tiempo real y te dice, en voz alta y en tu idioma, si tu calle está en riesgo y qué hacer.",
    cta: "Habla con FloodLine",
    secondary: "Ver mapa en vivo",
  },
};

export default function Landing() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const t = COPY[lang];

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <div className="flex rounded-full border border-zinc-800 p-0.5 text-xs">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 transition-colors ${lang === l ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"}`}
              >
                {l === "en" ? "English" : "Español"}
              </button>
            ))}
          </div>

          <motion.span
            key={`badge-${lang}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-400"
          >
            {t.badge}
          </motion.span>

          <motion.h1
            key={`title-${lang}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
            className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            {t.title}
          </motion.h1>

          <motion.p
            key={`body-${lang}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
            className="max-w-md text-base leading-relaxed text-zinc-400"
          >
            {t.body}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease }}
            className="flex flex-wrap gap-3"
          >
            <Button asChild className="group h-11 rounded-xl bg-white px-6 font-semibold text-zinc-900 hover:bg-zinc-100">
              <Link to="/map">
                {t.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl border-zinc-700 bg-transparent px-6 text-zinc-200 hover:bg-zinc-900 hover:text-white">
              <Link to="/map">{t.secondary}</Link>
            </Button>
          </motion.div>
        </div>

        {/* Globe spins in from the other side of the world and settles on Houston */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease }}
          className="relative mx-auto w-full max-w-lg text-zinc-500"
        >
          <div className="pointer-events-none absolute inset-0 rounded-full bg-sky-500/10 blur-3xl" />
          <Globe
            className="relative aspect-square w-full"
            variant="wireframe"
            strokeWidth={0.6}
            graticuleOpacity={0.12}
            initialRotation={[-200, 0]}
            rotateCities={HOUSTON_ONLY}
            rotationSpeed={5000}
            markers={HOUSTON_MARKER}
          />
        </motion.div>
      </div>
    </section>
  );
}