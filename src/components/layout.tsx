import { NavLink, Outlet } from "react-router-dom";
import { Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/map", label: "Live Map" },
  { to: "/alerts", label: "Alerts" },
  { to: "/profile", label: "Profile" },
];

export default function Layout() {
  return (
    // "dark" here turns on every dark: variant in the app
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-[1000] border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10">
              <Waves className="h-4 w-4 text-sky-400" />
            </span>
            FloodLine
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-1.5 transition-colors",
                    isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <NavLink to="/auth" className="ml-2 rounded-lg bg-white px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-100">
              Log in
            </NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
