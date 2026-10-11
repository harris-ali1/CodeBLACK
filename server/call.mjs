// Phone-call alerts: asks the ElevenLabs agent to call the signed-in user and read them a
// flood warning, over the Twilio number imported into ElevenLabs.
//
// Runs inside the Vite dev/preview server (see vite.config.ts). The ElevenLabs key stays on
// the server and is never sent to the browser.
//
// .env.local (no VITE_ prefix for the secret):
//   ELEVENLABS_API_KEY=...            ElevenLabs API key
//   ELEVENLABS_PHONE_NUMBER_ID=phnum_...   the imported Twilio number (Phone Numbers tab)
//   ELEVENLABS_AGENT_ID=...           optional: defaults to VITE_ELEVENLABS_AGENT_ID
//
// Safety: we only ever call the number saved on the *caller's own* profile, and only if they ticked
// "Allow FloodLine to call me". The phone number is read from Supabase here, never taken from the browser.

const OUTBOUND_CALL = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call";
const MIN_GAP_MS = 60_000; // one call per user per minute
const HOURLY_CAP = 30; // whole-server cap so a bug can't run up a bill

export function createCaller(env) {
  const agentId = env.ELEVENLABS_AGENT_ID || env.VITE_ELEVENLABS_AGENT_ID;
  const configured = Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_PHONE_NUMBER_ID && agentId);
  const lastCall = new Map(); // userId -> time
  let hourStart = Date.now();
  let hourCount = 0;

  const reply = (res, status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  async function readJson(req) {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20_000) throw new Error("body too large");
    }
    return raw ? JSON.parse(raw) : {};
  }

  // Validate the caller's Supabase session, then read *their own* saved call settings (row-level security applies)
  async function loadCaller(req) {
    const auth = req.headers.authorization;
    const base = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    if (!auth?.startsWith("Bearer ") || !base) return null;
    const u = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey: key } });
    if (!u.ok) return null;
    const { id } = await u.json();
    const p = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=phone,call_consent,language,dependents`,
      { headers: { Authorization: auth, apikey: key } },
    );
    const row = p.ok ? ((await p.json())[0] ?? {}) : {};
    return { id, ...row };
  }

  // Connect-style middleware mounted at /api/call
  async function middleware(req, res) {
    const path = (req.url ?? "/").split("?")[0];

    if (req.method === "GET" && path === "/status") return reply(res, 200, { configured });
    if (req.method !== "POST" || path !== "/") return reply(res, 404, { error: "Not found" });
    if (!configured) return reply(res, 503, { error: "Phone calls aren't set up on this server yet" });

    try {
      const me = await loadCaller(req);
      if (!me) return reply(res, 401, { error: "Sign in first" });
      if (!me.call_consent || !me.phone) return reply(res, 403, { error: "Turn on call alerts and save your phone number first" });

      const now = Date.now();
      if (now - hourStart > 3_600_000) [hourStart, hourCount] = [now, 0];
      if (hourCount >= HOURLY_CAP) return reply(res, 429, { error: "Call limit reached for now" });
      if (now - (lastCall.get(me.id) ?? 0) < MIN_GAP_MS) return reply(res, 429, { error: "A call was just placed. Try again in a minute." });

      const { message } = await readJson(req);
      if (typeof message !== "string" || !message.trim() || message.length > 1500) return reply(res, 400, { error: "Bad message" });

      lastCall.set(me.id, now);
      hourCount += 1;

      const out = await fetch(OUTBOUND_CALL, {
        method: "POST",
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: env.ELEVENLABS_PHONE_NUMBER_ID,
          to_number: me.phone,
          conversation_initiation_client_data: {
            // Fills {{...}} slots in the agent's prompt and first message
            dynamic_variables: {
              alert_message: message,
              preferred_language: me.language === "es" ? "Spanish" : "English",
              household_notes: me.dependents?.trim() || "none provided",
            },
          },
        }),
      });
      const result = await out.json().catch(() => ({}));
      if (!out.ok || result.success === false) {
        console.error("[call] ElevenLabs refused the call:", out.status, JSON.stringify(result).slice(0, 300));
        return reply(res, 502, { error: "The call couldn't be placed" });
      }
      return reply(res, 200, { placed: true });
    } catch (err) {
      console.error("[call]", err.message);
      return reply(res, 500, { error: "Call request failed" });
    }
  }

  return { middleware, configured };
}
