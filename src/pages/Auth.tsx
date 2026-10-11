import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-navy-700 bg-navy-800/60 px-4 py-2.5 text-sm text-navy-100 placeholder:text-navy-600 outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10";

export default function Auth() {
  const { user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

 const destination = (location.state as { from?: string } | null)?.from ?? "/";

  if (loading) return <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-navy-400">Loading account…</div>;
  if (user) return <Navigate to={destination} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setMessage("");

    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });

    setSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }
    navigate(destination, { replace: true });
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4 py-12">
      <form onSubmit={submit} className="w-full rounded-2xl border border-navy-800 bg-navy-900 p-6 sm:p-8">
        <div className="mb-7">
          <span className="text-sm font-medium text-cyan-400">FloodLine account</span>
          <h1 className="mt-2 text-3xl font-bold text-white">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-400">
            {mode === "signin" ? "Sign in to see your household alerts." : "Save your household details and receive tailored alerts."}
          </p>
        </div>

        {!configured ? (
          <p className="rounded-xl border border-alert-400/30 bg-alert-400/10 p-4 text-sm text-alert-200">
            Authentication needs Supabase configuration. Add the project URL and anonymous key to <code>.env.local</code> using <code>.env.example</code> as a guide.
          </p>
        ) : (
          <>
            <div className="flex rounded-xl bg-navy-800 p-1 text-sm">
              <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded-lg py-2 ${mode === "signin" ? "bg-navy-700 text-white" : "text-navy-400"}`}>Sign in</button>
              <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-lg py-2 ${mode === "signup" ? "bg-navy-700 text-white" : "text-navy-400"}`}>Sign up</button>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              {mode === "signup" && <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className={inputClass} />}
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className={inputClass} />
              <input required type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (at least 6 characters)" className={inputClass} />
            </div>
            {message && <p className="mt-4 text-sm text-cyan-300" role="status">{message}</p>}
            <Button disabled={submitting} className="mt-6 h-11 w-full rounded-xl bg-cyan-400 font-bold text-navy-950 hover:bg-cyan-300">
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </>
        )}
      </form>
    </section>
  );
}
