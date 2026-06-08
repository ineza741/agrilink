import {
  BarChart3,
  Bug,
  Droplets,
  FlaskConical,
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
      { label: "Admin Home", path: "/dashboard", icon: Home },
      { label: "Farmer Management", path: "/farms", icon: Users },
      { label: "Content Management", path: "/recommendations", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [{ label: "System Reports", path: "/analytics", icon: BarChart3 }],
  },
];

export const farmerNavigationSections = [
  {
    title: "",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: Home },
      { label: "Weather", path: "/weather", icon: Droplets },
      { label: "Soil & Crop", path: "/soil-crop", icon: FlaskConical },
      { label: "AI Recommendation", path: "/ai-recommendation", icon: Sprout },
      { label: "Market Intelligence", path: "/market-intelligence", icon: BarChart3 },
      { label: "Pest Prediction", path: "/pests-diseases", icon: Bug },
      { label: "Irrigation & Fertilizer", path: "/irrigation-fertilizer", icon: Tractor },
      { label: "Regional Monitoring", path: "/regional-monitoring", icon: Map },
      { label: "Analytics and Reports", path: "/analytics", icon: BarChart3 },
      { label: "Community", path: "/community", icon: Users },
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
  "/profile": { crumb: "Profile" },
  "/soil-crop": { crumb: "Soil & Crop" },
  "/ai-recommendation": { crumb: "AI Recommendation" },
  "/recommendations": { crumb: "Recommendations" },
  "/market-intelligence": { crumb: "Market Intelligence" },
  "/weather": { crumb: "Weather" },
  "/pests-diseases": { crumb: "Pest Prediction" },
  "/analytics": { crumb: "Analytics and Reports" },
  "/notifications": { crumb: "Notifications" },
  "/community": { crumb: "Community" },
  "/irrigation-fertilizer": { crumb: "Irrigation & Fertilizer" },
  "/regional-monitoring": { crumb: "Regional Monitoring" },
  "/settings": { crumb: "Settings" },
  "/farms": { crumb: "Farmer Management" },
  "/farms/new": { crumb: "Add New Farm" },
};
