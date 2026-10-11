import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/layout";
import RequireAuth from "@/components/require-auth";
import Landing from "@/pages/Landing";
import MapPage from "@/pages/MapPage";
import Profile from "@/pages/Profile";
import Alerts from "@/pages/Alerts";
import Auth from "@/pages/Auth";
import { AuthProvider } from "@/components/auth-provider";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public: anyone can see the login page */}
            <Route path="/auth" element={<Auth />} />

            {/* Protected: must be logged in */}
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Landing />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/alerts" element={<Alerts />} />
            </Route>

            {/* Unknown URLs go home (which redirects to login if needed) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </AuthProvider>
  );
}