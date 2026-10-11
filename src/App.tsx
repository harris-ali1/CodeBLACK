import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/layout";
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
            <Route path="/" element={<Landing />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/auth" element={<Auth />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </AuthProvider>
  );
}