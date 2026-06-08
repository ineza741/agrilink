import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { AdminPage } from "../pages/admin/AdminPage";
import { AiRecommendationPage } from "../pages/ai/AiRecommendationPage";
import { AnalyticsPage } from "../pages/analytics/AnalyticsPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { CommunityPage } from "../pages/community/CommunityPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { FarmerDashboardPage } from "../pages/dashboard/FarmerDashboardPage";
import { ProfilePage } from "../pages/farmers/ProfilePage";
import { AddFarmPage } from "../pages/farms/AddFarmPage";
import { FarmsPage } from "../pages/farms/FarmsPage";
import { IrrigationPage } from "../pages/irrigation/IrrigationPage";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { MarketPage } from "../pages/market/MarketPage";
import { NotificationsPage } from "../pages/notifications/NotificationsPage";
import { PestsPage } from "../pages/pests/PestsPage";
import { RegionalMonitoringPage } from "../pages/regional/RegionalMonitoringPage";
import { RecommendationsPage } from "../pages/recommendations/RecommendationsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { SoilCropPage } from "../pages/soil-crop/SoilCropPage";
import { WeatherPage } from "../pages/weather/WeatherPage";

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

function RoleDashboardPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <DashboardPage /> : <FarmerDashboardPage />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/farms/new" element={<AddFarmPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/soil-crop" element={<SoilCropPage />} />
        <Route path="/ai-recommendation" element={<AiRecommendationPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/market-intelligence" element={<MarketPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/pests-diseases" element={<PestsPage />} />
        <Route path="/irrigation-fertilizer" element={<IrrigationPage />} />
        <Route path="/regional-monitoring" element={<RegionalMonitoringPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
