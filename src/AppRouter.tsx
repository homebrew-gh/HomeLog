import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import License from "./pages/License";
import { NIP19Page } from "./pages/NIP19Page";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { VehicleMaintenancePage } from "./pages/VehicleMaintenancePage";
import { ApplianceMaintenancePage } from "./pages/ApplianceMaintenancePage";
import { HomeFeatureMaintenancePage } from "./pages/HomeFeatureMaintenancePage";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/license" element={<License />} />
        <Route path="/asset/:type/:id" element={<AssetDetailPage />} />
        <Route path="/vehicle/:vehicleId/maintenance" element={<VehicleMaintenancePage />} />
        <Route path="/appliance/:applianceId/maintenance" element={<ApplianceMaintenancePage />} />
        <Route path="/home-feature/:feature/maintenance" element={<HomeFeatureMaintenancePage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;