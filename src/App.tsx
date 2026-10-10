import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout";
import Landing from "@/pages/Landing";
import MapPage from "@/pages/MapPage";
import Profile from "@/pages/Profile";
import Alerts from "@/pages/Alerts";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}