// US phone helpers. We store numbers in E.164 (+17135550123), the format phone providers expect.

/** "(713) 555-0123", "713-555-0123" or "1 713 555 0123" -> "+17135550123". Returns null if it isn't a US number. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** "+17135550123" -> "(713) 555-0123" */
export function formatPhone(e164: string | null | undefined): string {
  const d = (e164 ?? "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (e164 ?? "");
}

/** "+17135550123" -> "(•••) •••-0123", for showing a number without exposing it fully */
export function maskPhone(e164: string | null | undefined): string {
  const d = (e164 ?? "").replace(/\D/g, "").slice(-4);
  return d ? `(•••) •••-${d}` : "";
}
