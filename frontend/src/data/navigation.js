import {
  BarChart3,
  Bug,
  Droplets,
  FlaskConical,
  BellRing,
  Home,
  Map,
  Sprout,
  Tractor,
  Users,
  FileText,
} from "lucide-react";

export const adminNavigationSections = [
  {
    title: "Main Menu",
    items: [
      { label: "Admin Dashboard", path: "/dashboard", icon: Home },
      { label: "Farmer Management", path: "/farms", icon: Users },
      { label: "Regional Monitoring Dashboard", path: "/regional-monitoring", icon: Map },
      { label: "Content Management", path: "/recommendations", icon: FileText },
      { label: "System Notifications", path: "/notifications", icon: BellRing },
    ],
  },
  {
    title: "System",
    items: [{ label: "Reports & Data Export", path: "/analytics", icon: BarChart3 }],
  },
];

export const farmerNavigationSections = [
  {
    title: "",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: Home },
      { label: "Farm Profile", path: "/profile", icon: Users },
      { label: "Weather & Climate", path: "/weather", icon: Droplets },
      { label: "Soil & Crop Analysis", path: "/soil-crop", icon: FlaskConical },
      { label: "AI Recommendations", path: "/ai-recommendation", icon: Sprout },
      { label: "Market Intelligence", path: "/market-intelligence", icon: BarChart3 },
      { label: "Pest & Disease", path: "/pests-diseases", icon: Bug },
      { label: "Irrigation & Fertilizer", path: "/irrigation-fertilizer", icon: Tractor },
      { label: "Analytics & Reports", path: "/analytics", icon: BarChart3 },
      { label: "Notifications", path: "/notifications", icon: BellRing },
      { label: "Community & Knowledge", path: "/community", icon: Users },
    ],
  },
];

export const brandConfig = {
  name: "AgriSupport",
  adminFooterName: "Dr. Aris Thorne",
  adminFooterRole: "Regional Director",
  currentSession: "Extension Node: #042-East",
  farmerSubtitle: "Academic AI v2.4",
  supportLabel: "Support",
};

export const routeMeta = {
  "/dashboard": { crumb: "Dashboard" },
  "/profile": { crumb: "Farm Profile" },
  "/soil-crop": { crumb: "Soil & Crop Analysis" },
  "/ai-recommendation": { crumb: "AI Recommendations" },
  "/recommendations": { crumb: "Content Management" },
  "/market-intelligence": { crumb: "Market Intelligence" },
  "/weather": { crumb: "Weather & Climate" },
  "/pests-diseases": { crumb: "Pest & Disease" },
  "/analytics": { crumb: "Analytics and Reports" },
  "/notifications": { crumb: "Notifications" },
  "/community": { crumb: "Community & Knowledge" },
  "/irrigation-fertilizer": { crumb: "Irrigation & Fertilizer" },
  "/regional-monitoring": { crumb: "Regional Monitoring Dashboard" },
  "/settings": { crumb: "Settings" },
  "/farms": { crumb: "Farmer Management" },
  "/farms/new": { crumb: "Add New Farm" },
};
