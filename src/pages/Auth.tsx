import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/10";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4 py-12">
      <form onSubmit={(event) => event.preventDefault()} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
        <span className="text-sm font-medium text-sky-400">FloodLine account</span>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {mode === "login" ? "Sign in to view your flood alerts." : "Create an account for tailored flood alerts."}
        </p>

        <div className="mt-6 flex rounded-xl bg-zinc-800 p-1 text-sm">
          <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-lg py-2 transition-colors ${mode === "login" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}>
            Log in
          </button>
          <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-lg py-2 transition-colors ${mode === "signup" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}>
            Sign up
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <input type="email" placeholder="Email address" className={inputClass} />
          <input type="password" placeholder="Password" className={inputClass} />
          {mode === "signup" && <input type="text" placeholder="Home address" className={inputClass} />}
          {mode === "signup" && <input type="tel" placeholder="Phone number" className={inputClass} />}
        </div>

        <Button type="submit" className="mt-6 h-11 w-full rounded-xl bg-white text-zinc-900 hover:bg-zinc-100">
          {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {mode === "login" ? "Log in" : "Create account"}
        </Button>

        <p className="mt-4 text-center text-xs text-zinc-500">Account functionality will be connected by the database team.</p>
      </form>
    </section>
  );
}
