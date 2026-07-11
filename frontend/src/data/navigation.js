import {
  BarChart3,
  Bug,
  Droplets,
  FlaskConical,
  BellRing,
  Home,
  Map,
  Sprout,
  TrendingUp,
  Users,
  FileText,
  History,
} from "lucide-react";

export const adminNavigationSections = [
  {
    title: "Main Menu",
    items: [
      { label: "Admin Dashboard", path: "/dashboard", icon: Home },
      { label: "Farmer Management", path: "/farms", icon: Users },
      { label: "Market Officer Applications", path: "/market-officer-applications", icon: Users },
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
      { label: "Irrigation Management", path: "/irrigation-fertilizer", icon: Droplets },
      { label: "Analytics & Reports", path: "/analytics", icon: BarChart3 },
      { label: "Notifications", path: "/notifications", icon: BellRing },
    ],
  },
];

export const marketOfficerNavigationSections = [
  {
    title: "Main Menu",
    items: [
      { label: "Dashboard", path: "/market-officer/dashboard", icon: Home },
      { label: "Crop Prices", path: "/market-officer/prices", icon: TrendingUp },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", path: "/market-officer/profile", icon: Users },
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
  "/irrigation-fertilizer": { crumb: "Irrigation Management" },
  "/regional-monitoring": { crumb: "Regional Monitoring Dashboard" },
  "/farms": { crumb: "Farmer Management" },
  "/farms/new": { crumb: "Add New Farm" },
  "/market-officer-applications": { crumb: "Market Officer Applications" },
  "/crop-prices": { crumb: "Crop Prices" },
  "/market-officer/dashboard": { crumb: "Dashboard" },
  "/market-officer/prices": { crumb: "Crop Prices" },
  "/market-officer/profile": { crumb: "Profile" },
};
