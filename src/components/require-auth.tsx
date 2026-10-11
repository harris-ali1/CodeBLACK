import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth-provider";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait until Supabase has checked for an existing session
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-navy-400">
        Loading…
      </div>
    );
  }

  // Not logged in → send to the login page, remembering where they were going
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // Logged in → show the requested page
  return <Outlet />;
}