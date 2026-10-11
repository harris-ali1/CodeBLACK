// Builds the flood warning shown in the alarm and read aloud on the phone call by the
// ElevenLabs voice. It adapts to what the user wrote about their dependents
// ("elderly mother, two kids, uses a wheelchair"), in English or Spanish.
import { directionsUrl, type Shelter } from "@/lib/shelters";

type Lang = "en" | "es";

interface Needs {
  mobility: boolean;
  elderly: boolean;
  children: boolean;
  medical: boolean;
  pets: boolean;
}

// Keyword matching works on English and Spanish free text
export function parseDependents(text: string): Needs {
  const t = text.toLowerCase();
  return {
    mobility: /mobil|wheelchair|walker|\bcane\b|disab|bedridden|paraly|silla de ruedas|movilidad|discapac/.test(t),
    elderly: /elder|senior|grand(ma|pa|mother|father|parent)|\bold (man|woman|person|lady)|abuel|mayor|anciano/.test(t),
    children: /child|\bkids?\b|baby|babies|infant|toddler|newborn|\bson\b|daughter|niñ|hij[oa]|beb[eé]|menor/.test(t),
    medical: /oxygen|dialysis|insulin|medical|medicat|ventilator|oxíg|oxig|diális|dialis|insulina|medicina/.test(t),
    pets: /\bpets?\b|\bdogs?\b|\bcats?\b|puppy|kitten|perr[oa]|gat[oa]|mascota/.test(t),
  };
}

const COPY = {
  en: {
    headline: (g: string, d: string) => `Flood alarm: ${g} is flooding ${d} miles from you.`,
    mobility: "Someone in your home has limited mobility, so leave early. If you can't get out safely, call 911 now.",
    elderly: "Help your elderly family member get ready to leave now. Don't wait for the water to reach your street.",
    children: "Keep children close and away from the water, and pack what they need.",
    medical: "Take medicines and medical equipment with you.",
    pets: "Bring your pets with you.",
    evacuate: "If water is rising near you, move to higher ground now or head to a shelter. Don't wait.",
    always: "Never drive through floodwater. Turn around, don't drown. If you are in danger, call 911.",
    intro: "This is an automated flood warning from FloodLine, read by an AI voice.",
    testIntro: "This is a test of FloodLine flood warnings, read by an AI voice. This is not a real emergency.",
    shelter: (n: string, d: string) => `Nearest shelter: ${n}, ${d} miles away.`,
    shelters: "Places to go",
    confirm: "Call 211 or check redcross.org to confirm a shelter is open before you go.",
    stay: "Stay safe.",
  },
  es: {
    headline: (g: string, d: string) => `Alarma de inundación: ${g} se está inundando a ${d} millas de usted.`,
    mobility: "Alguien en su hogar tiene movilidad limitada, así que salgan temprano. Si no pueden salir con seguridad, llame al 911 ahora.",
    elderly: "Ayude a su familiar mayor a prepararse para salir ahora. No espere a que el agua llegue a su calle.",
    children: "Mantenga a los niños cerca y lejos del agua, y lleve lo que necesiten.",
    medical: "Lleve sus medicinas y su equipo médico.",
    pets: "Lleve a sus mascotas.",
    evacuate: "Si el agua está subiendo cerca de usted, vaya ahora a un lugar más alto o a un refugio. No espere.",
    always: "Nunca maneje por agua de inundación. Dé la vuelta, no se ahogue. Si está en peligro, llame al 911.",
    intro: "Este es un aviso automático de inundación de FloodLine, leído por una voz de inteligencia artificial.",
    testIntro: "Esta es una prueba de los avisos de inundación de FloodLine, leída por una voz de inteligencia artificial. No es una emergencia real.",
    shelter: (n: string, d: string) => `Refugio más cercano: ${n}, a ${d} millas.`,
    shelters: "A dónde ir",
    confirm: "Llame al 211 o visite redcross.org para confirmar que un refugio esté abierto antes de ir.",
    stay: "Cuídese.",
  },
};

export interface AlertInput {
  gaugeName: string;
  distanceMi: number;
  dependents: string;
  language: string;
  shelters: Shelter[];
  /** true when FEMA confirms the shelters are open; otherwise remind the user to check */
  sheltersLive: boolean;
}

export interface AlertMessage {
  headline: string;
  /** Advice lines tailored to the household, ending with the safety reminder */
  advice: string[];
  /** Plain text version (includes the shelter list and directions links) */
  text: string;
  /** What the ElevenLabs voice says (without the intro sentence) */
  spoken: string;
  /** Opening sentence for a real call, and for a test call, in the user's language */
  intro: string;
  testIntro: string;
}

export function buildAlert(input: AlertInput): AlertMessage {
  const c = COPY[(input.language === "es" ? "es" : "en") as Lang];
  const needs = parseDependents(input.dependents);
  const d = input.distanceMi.toFixed(1);

  const advice = [
    needs.mobility && c.mobility,
    needs.elderly && c.elderly,
    needs.children && c.children,
    needs.medical && c.medical,
    needs.pets && c.pets,
    c.evacuate,
    c.always,
  ].filter((x): x is string => Boolean(x));

  const headline = c.headline(input.gaugeName, d);
  const nearest = input.shelters[0];
  const shelterSpoken = nearest ? c.shelter(nearest.name, nearest.distanceMi.toFixed(1)) : "";

  const shelterLines = input.shelters.map(
    (s) => `• ${s.name}, ${s.distanceMi.toFixed(1)} mi: ${s.address}\n  ${directionsUrl(s)}`,
  );

  return {
    headline,
    advice,
    intro: c.intro,
    testIntro: c.testIntro,
    spoken: [headline, ...advice, shelterSpoken, c.stay].filter(Boolean).join(" "),
    text: [
      headline,
      advice.map((a) => `• ${a}`).join("\n"),
      shelterLines.length
        ? `${c.shelters}:\n${shelterLines.join("\n")}${input.sheltersLive ? "" : `\n${c.confirm}`}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
