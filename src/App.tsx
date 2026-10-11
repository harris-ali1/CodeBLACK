import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout";
import Landing from "@/pages/Landing";
import MapPage from "@/pages/MapPage";
import Profile from "@/pages/Profile";
import Alerts from "@/pages/Alerts";
import Auth from "@/pages/Auth";
import { AuthProvider } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase"; // ← change to match your project's file

/*export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/auth" element={<Auth />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}*/

export default function App() {
  // Temporary Supabase connection test — remove when done
  useEffect(() => {
    if (!supabase) {
      console.log("Supabase is not configured. Check .env.local");
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .then(({ data, error }) => {
        console.log("Data:", data);
        console.log("Error:", error);
      });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/auth" element={<Auth />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}