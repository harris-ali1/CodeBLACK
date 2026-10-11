// Browser side of the phone-call alerts. The call itself is placed by the server (server/call.mjs),
// which looks up the signed-in user's own saved number, so the browser never sends a phone number.
import { supabase } from "@/lib/supabase";

/** Is the server set up to place calls (ElevenLabs key + imported Twilio number)? */
export async function callsConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/call/status");
    return res.ok && Boolean(((await res.json()) as { configured?: boolean }).configured);
  } catch {
    return false;
  }
}

/** Asks the server to call the signed-in user and read `message`. Throws with a readable message on failure. */
export async function placeAlertCall(message: string): Promise<void> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in first");
  const res = await fetch("/api/call", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `The call couldn't be placed (${res.status})`);
  }
}
