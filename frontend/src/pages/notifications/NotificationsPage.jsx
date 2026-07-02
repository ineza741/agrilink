import {
  Archive,
  BarChart,
  Bell,
  Bot,
  Bug,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  ExternalLink,
  Eye,
  Filter,
  Info,
  Leaf,
  Mail,
  MapPin,
  MessageSquareText,
  RadioTower,
  Search,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  Siren,
  Sprout,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { MetricCard } from "../../components/common/MetricCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FilterChip } from "../../components/common/FilterBar";

const NOTIFICATION_STORAGE_KEY = "agri-feed-notification-center-v3";
const DEMO_MODE = true;

const severityRank = { critical: 0, high: 1, warning: 2, info: 3 };

const categoryDefinitions = [
  { id: "all", label: "All Alerts", icon: Bell },
  { id: "weather", label: "Weather", icon: CloudRain },
  { id: "pests", label: "Pests & Diseases", icon: Bug },
  { id: "market", label: "Market", icon: ShoppingCart },
  { id: "irrigation", label: "Irrigation", icon: Sprout },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "system", label: "System", icon: ShieldAlert },
];

const escalationSteps = ["Farmer", "Extension Officer", "District Agronomist", "National Alert Center"];
const deliveryStatuses = ["Delivered", "Opened", "Acknowledged", "Pending", "Failed"];
const summaryFrequencies = ["Daily", "Weekly", "Monthly"];
const districtOptions = ["All Districts", "Kicukiro District", "Bugesera District", "Musanze District", "Rwamagana District", "Huye District", "Rubavu District"];
const advancedPreferenceKeys = [{ id: "weather", label: "Weather Alerts" }, { id: "pest", label: "Pest Alerts" }, { id: "market", label: "Market Alerts" }, { id: "irrigation", label: "Irrigation Alerts" }, { id: "analytics", label: "Analytics Alerts" }];

const smsCommands = [
  { command: "ALERTS", response: "Returns the latest critical and high priority advisories for the active farm." },
  { command: "WEATHER", response: "Returns the latest weather warning, rainfall outlook, and next irrigation recommendation." },
  { command: "PEST", response: "Returns nearby outbreak risk, likely pest pressure, and the recommended field action." },
  { command: "MARKET MAIZE", response: "Returns nearest market prices and AI selling recommendation for maize." },
];

const templateSeed = [
  { id: "weather-template", title: "Weather Alerts", category: "Weather", description: "Auto-generates advisories for rain deficits, heavy rainfall, strong wind, and heat stress windows.", status: "Published", lastUpdated: "19 Jun 2026" },
  { id: "pest-template", title: "Pest Outbreaks", category: "Pest", description: "Used when weather and farmer reports indicate increasing disease or insect pressure.", status: "Published", lastUpdated: "18 Jun 2026" },
  { id: "market-template", title: "Market Opportunities", category: "Market", description: "Shares buyer demand signals, price alert thresholds, and best market routing advice.", status: "Review", lastUpdated: "17 Jun 2026" },
  { id: "irrigation-template", title: "Irrigation Reminders", category: "Irrigation", description: "Combines soil moisture, ET, and rainfall outlook to trigger irrigation windows.", status: "Published", lastUpdated: "19 Jun 2026" },
  { id: "harvest-template", title: "Harvest Notifications", category: "Harvest", description: "Flags maturity windows, post-harvest weather risk, and expected market timing.", status: "Draft", lastUpdated: "16 Jun 2026" },
];

function loadStoredState() { try { return JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "{}"); } catch { return {}; } }
function saveStoredState(state) { localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(state)); }
function isoDaysAgo(days, hour = 8) { const date = new Date(); date.setHours(hour, 0, 0, 0); date.setDate(date.getDate() - days); return date.toISOString(); }
function channelLabel(channel) { if (channel === "sms") return "SMS"; if (channel === "email") return "Email"; if (channel === "push") return "Push"; return "In-App"; }
function categoryLabel(category) { return categoryDefinitions.find((item) => item.id === category)?.label || "System"; }
function alertIcon(category) { if (category === "weather") return CloudRain; if (category === "pests") return Bug; if (category === "market") return ShoppingCart; if (category === "irrigation") return Sprout; if (category === "analytics") return TrendingUp; return ShieldAlert; }
function getSeverityLabel(severity) { if (severity === "critical") return "Critical"; if (severity === "high") return "High"; if (severity === "warning") return "Warning"; return "Info"; }
function getAckLabel(status) { if (status === "confirmed") return "Confirmed"; if (status === "expired") return "Expired"; return "Pending"; }
function getTimelineGroup(isoString) { const created = new Date(isoString); const today = new Date(); today.setHours(0, 0, 0, 0); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (created >= today) return "Today"; if (created >= yesterday) return "Yesterday"; return "Earlier"; }
function formatTimeLabel(isoString) { return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function sortAlerts(alerts) { return [...alerts].sort((left, right) => { const severityDiff = (severityRank[left.severity] ?? 9) - (severityRank[right.severity] ?? 9); if (severityDiff !== 0) return severityDiff; return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(); }); }

function createBaseNotifications(farm) {
  const farmName = farm?.name || "Gatenga Demonstration Plot";
  const district = farm?.district || "Kicukiro District";
  const sector = farm?.sector || "Gatenga Sector";
  const crop = farm?.primaryCrop || farm?.cropHistory?.[0]?.name || "Maize";
  return [
    { id: "weather-critical-gatenga", category: "weather", severity: "critical", source: "Weather API", sourceLabel: "Live Weather Data", title: `Severe moisture deficit detected in ${farmName}`, body: "No effective rainfall is expected over the next 7 days and field moisture has dropped below the comfort range for the current crop stage.", requiredAction: "Start irrigation within the next 12 hours and review mulch coverage.", recommendedAction: "Open the irrigation plan and trigger the next irrigation block today.", explanation: "Open-Meteo rainfall totals remain below the crop comfort range while evapotranspiration remains elevated.", deadline: "Today, 18:00", confidence: 91, channels: ["in-app", "sms", "push"], createdAt: isoDaysAgo(0, 7), read: false, archived: false, ackStatus: "pending", deliveryStatus: "Delivered", relatedModule: "/irrigation-fertilizer", district, sector, crop, escalationLevel: 1, escalationPath: escalationSteps },
    { id: "pest-high-aphid", category: "pests", severity: "high", source: "AI Engine", sourceLabel: "Demo Pest Data", title: "Aphid outbreak pressure increasing near Gatenga Sector", body: "Humidity above 78% and recent canopy density reports increase aphid development risk in maize and beans across nearby plots.", requiredAction: "Inspect edge rows, check trap counts, and prepare targeted IPM response.", recommendedAction: "Inspect hotspot rows and prepare neem-based or selective control depending on trap count.", explanation: "The prediction combines symptom reports, weather pressure, and prior outbreak history from nearby farms.", deadline: "Tomorrow, 10:00", confidence: 87, channels: ["in-app", "email"], createdAt: isoDaysAgo(0, 10), read: false, archived: false, ackStatus: "pending", deliveryStatus: "Opened", relatedModule: "/pests-diseases", district, sector, crop, escalationLevel: 2, escalationPath: escalationSteps },
    { id: "market-maize-opportunity", category: "market", severity: "info", source: "Market Feed", sourceLabel: "Demo Market Data", title: "Maize demand rising in Kigali collection markets", body: "Buyer activity has improved in Kicukiro and Nyarugenge routes, with slightly stronger wholesale demand for cleaned grain lots.", requiredAction: "Compare transport cost against expected selling price before dispatch.", recommendedAction: "Hold grain for 3-5 days while monitoring Kigali market opportunity score.", explanation: "Demand and projected price movement are improving faster than transport costs in nearby markets.", deadline: "Within 3 days", confidence: 79, channels: ["in-app", "email"], createdAt: isoDaysAgo(1, 9), read: true, archived: false, ackStatus: "confirmed", deliveryStatus: "Acknowledged", relatedModule: "/market-intelligence", district, sector, crop, escalationLevel: 0, escalationPath: escalationSteps },
    { id: "irrigation-reminder", category: "irrigation", severity: "warning", source: "Soil Sensor", sourceLabel: "Local Data", title: "Irrigation reminder window approaching", body: "The next irrigation window aligns with low wind speed and lower evaporative loss during the early morning period.", requiredAction: "Prepare irrigation set and confirm pump readiness before sunrise.", recommendedAction: "Apply the recommended irrigation block before 06:00 and record the completed cycle.", explanation: "Soil moisture dropped below the preferred trigger while wind and temperature conditions favor morning irrigation efficiency.", deadline: "Tomorrow, 05:30", confidence: 83, channels: ["in-app", "push"], createdAt: isoDaysAgo(1, 14), read: false, archived: false, ackStatus: "pending", deliveryStatus: "Pending", relatedModule: "/irrigation-fertilizer", district, sector, crop, escalationLevel: 0, escalationPath: escalationSteps },
    { id: "analytics-yield-drift", category: "analytics", severity: "warning", source: "AI Engine", sourceLabel: "Local Data", title: "Yield efficiency is trending below district benchmark", body: "Recent cost-weighted output suggests this farm may finish the cycle slightly below the district average unless input timing improves.", requiredAction: "Review nutrient timing and irrigation consistency this week.", recommendedAction: "Follow the advisory sequence for fertilizer timing and check irrigation compliance.", explanation: "The AI engine compared current cost-output behavior with local benchmark trends and recent field decisions.", deadline: "Within 2 days", confidence: 76, channels: ["in-app", "email"], createdAt: isoDaysAgo(2, 11), read: true, archived: false, ackStatus: "pending", deliveryStatus: "Opened", relatedModule: "/analytics", district, sector, crop, escalationLevel: 1, escalationPath: escalationSteps },
    { id: "farmer-report-followup", category: "system", severity: "high", source: "Farmer Report", sourceLabel: "Local Data", title: "Field report requires extension follow-up", body: "A submitted field note indicates abnormal leaf yellowing near the lower terrace and requires expert review.", requiredAction: "Open the farmer report, verify symptoms, and attach a soil or pest follow-up action.", recommendedAction: "Escalate the report to the extension officer and attach field photos.", explanation: "Farmer reports receive higher urgency when they align with weather stress and recent nutrient warnings.", deadline: "Today, 16:00", confidence: 81, channels: ["in-app", "sms", "email"], createdAt: isoDaysAgo(0, 12), read: false, archived: false, ackStatus: "pending", deliveryStatus: "Failed", relatedModule: "/community", district, sector, crop, escalationLevel: 2, escalationPath: escalationSteps },
  ];
}

function normalizeNotifications(rawNotifications, farm) {
  if (!Array.isArray(rawNotifications) || rawNotifications.length === 0) return createBaseNotifications(farm);
  return rawNotifications.map((item, index) => ({ district: farm?.district || "Kicukiro District", sector: farm?.sector || "Gatenga Sector", crop: farm?.primaryCrop || "Maize", source: "System Notifications", sourceLabel: "Local Data", requiredAction: "Review the related module for the next response step.", recommendedAction: "Open the related module and confirm the field action.", explanation: "This advisory is being presented in frontend-only demonstration mode.", confidence: 75, channels: ["in-app"], deliveryStatus: "Delivered", escalationLevel: 0, escalationPath: escalationSteps, ackStatus: "pending", relatedModule: "/dashboard", read: false, archived: false, ...item, id: item.id || `notification-${index + 1}` }));
}

function buildDefaultPreferences(stored) {
  return { delivery: stored?.delivery || { email: true, sms: true, push: true, scheduledSummary: true }, categories: stored?.categories || { weather: true, pest: true, market: true, irrigation: true, analytics: true }, summaries: stored?.summaries || { Daily: true, Weekly: true, Monthly: false } };
}

function recommendationSnippet(alert) {
  return { action: alert?.recommendedAction || "Open related module for next advisory step.", confidence: alert?.confidence || 0, explanation: alert?.explanation || "Advice generated from local demo alert conditions." };
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentFarms } = useFarmerData();
  const primaryFarm = currentFarms?.[0] || { name: "Gatenga Demonstration Plot", district: "Kicukiro District", sector: "Gatenga Sector", primaryCrop: "Maize" };
  const farmSignature = `${primaryFarm.name}|${primaryFarm.district}|${primaryFarm.sector}|${primaryFarm.primaryCrop || "Maize"}`;
  const backendFarmId = primaryFarm?.backendFarmId || "";
  const userRole = String(user?.role || "").toLowerCase();
  const adminFacingMode = userRole === "admin" || userRole === "extensionofficer";
  const backendSessionEnabled = isBackendSessionActive() || user?.authSource === "backend";
  const backendEnabled = adminFacingMode || (backendSessionEnabled && Boolean(backendFarmId));
  const stored = useMemo(() => loadStoredState(), []);

  const [activeTab, setActiveTab] = useState(stored.activeTab || "timeline");
  const [categoryFilter, setCategoryFilter] = useState(stored.categoryFilter || "all");
  const [filters, setFilters] = useState(stored.filters || { search: "", severity: "all", district: adminFacingMode ? "All Districts" : primaryFarm.district || "All Districts", crop: "all", source: "all", status: "all", dateWindow: "all" });
  const [preferences, setPreferences] = useState(buildDefaultPreferences(stored.preferences));
  const [notifications, setNotifications] = useState(normalizeNotifications(stored.notifications, primaryFarm));
  const [templates, setTemplates] = useState(stored.templates || templateSeed);
  const [statusMessage, setStatusMessage] = useState("");
  const [backendLoading, setBackendLoading] = useState(false);

  useEffect(() => { saveStoredState({ activeTab, categoryFilter, filters, preferences, notifications, templates }); }, [activeTab, categoryFilter, filters, preferences, notifications, templates]);

  useEffect(() => {
    if (adminFacingMode) return;
    setNotifications((current) => {
      if (!Array.isArray(current) || current.length === 0) return createBaseNotifications(primaryFarm);
      let changed = false;
      const next = current.map((item) => { const updated = { ...item, district: primaryFarm.district || item.district, sector: primaryFarm.sector || item.sector, crop: primaryFarm.primaryCrop || item.crop }; if (updated.district !== item.district || updated.sector !== item.sector || updated.crop !== item.crop) changed = true; return updated; });
      return changed ? next : current;
    });
  }, [adminFacingMode, farmSignature]);

  const refreshBackendCenter = useCallback(async () => {
    if (!backendEnabled) return false;
    setBackendLoading(true);
    try {
      const center = await phase1BackendService.notifications.center(adminFacingMode ? "" : backendFarmId);
      if (center?.preferences) setPreferences(buildDefaultPreferences(center.preferences));
      if (Array.isArray(center?.templates) && center.templates.length > 0) setTemplates(center.templates);
      if (Array.isArray(center?.notifications) && center.notifications.length > 0) setNotifications(normalizeNotifications(center.notifications, primaryFarm)); else setNotifications(createBaseNotifications(primaryFarm));
      return true;
    } catch (error) { console.error("Notifications backend center load failed:", error); return false; } finally { setBackendLoading(false); }
  }, [adminFacingMode, backendEnabled, backendFarmId, farmSignature]);

  useEffect(() => { refreshBackendCenter(); }, [refreshBackendCenter]);
  useEffect(() => { if (!backendEnabled) return; const safetyTimeout = setTimeout(() => { setBackendLoading(false); }, 12000); return () => clearTimeout(safetyTimeout); }, [backendEnabled]);
  useEffect(() => { if (!statusMessage) return; const timeoutId = window.setTimeout(() => setStatusMessage(""), 3200); return () => window.clearTimeout(timeoutId); }, [statusMessage]);

  const sortedNotifications = useMemo(() => sortAlerts(notifications), [notifications]);
  const sourceOptions = useMemo(() => ["all", ...new Set(sortedNotifications.map((item) => item.source))], [sortedNotifications]);
  const cropOptions = useMemo(() => ["all", ...new Set(sortedNotifications.map((item) => item.crop).filter(Boolean))], [sortedNotifications]);

  const filteredNotifications = useMemo(() => {
    const base = activeTab === "history" ? sortedNotifications.filter((item) => item.read || item.archived || item.ackStatus !== "pending") : sortedNotifications.filter((item) => !item.archived);
    return base.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (filters.search) { const value = `${item.title} ${item.body} ${item.requiredAction} ${item.crop} ${item.district}`.toLowerCase(); if (!value.includes(filters.search.toLowerCase())) return false; }
      if (filters.severity !== "all" && item.severity !== filters.severity) return false;
      if (filters.district !== "All Districts" && item.district !== filters.district) return false;
      if (filters.crop !== "all" && item.crop !== filters.crop) return false;
      if (filters.source !== "all" && item.source !== filters.source) return false;
      if (filters.status !== "all" && item.deliveryStatus !== filters.status) return false;
      if (filters.dateWindow !== "all") {
        const created = new Date(item.createdAt); const now = new Date();
        const days = filters.dateWindow === "today" ? 0 : filters.dateWindow === "7d" ? 7 : filters.dateWindow === "30d" ? 30 : 365;
        if (days === 0 && created.toDateString() !== now.toDateString()) return false;
        if (days > 0) { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days); if (created < cutoff) return false; }
      }
      return true;
    });
  }, [activeTab, categoryFilter, filters, sortedNotifications]);

  const timelineGroups = useMemo(() => ["Today", "Yesterday", "Earlier"].map((label) => ({ label, items: filteredNotifications.filter((item) => getTimelineGroup(item.createdAt) === label) })), [filteredNotifications]);

  const summaryCards = useMemo(() => {
    const active = sortedNotifications.filter((item) => !item.archived);
    return [
      { label: "Critical Alerts", value: active.filter((item) => item.severity === "critical").length, tone: "critical" },
      { label: "Weather Alerts", value: active.filter((item) => item.category === "weather").length, tone: "weather" },
      { label: "Pest Alerts", value: active.filter((item) => item.category === "pests").length, tone: "pests" },
      { label: "Market Alerts", value: active.filter((item) => item.category === "market").length, tone: "market" },
      { label: "Unread Alerts", value: active.filter((item) => !item.read).length, tone: "system" },
    ];
  }, [sortedNotifications]);

  const priorityAlert = useMemo(() => sortAlerts(sortedNotifications.filter((item) => !item.archived && item.ackStatus !== "confirmed"))[0], [sortedNotifications]);
  const categoryStats = useMemo(() => categoryDefinitions.filter((item) => item.id !== "all").map((item) => ({ label: item.label, value: sortedNotifications.filter((alert) => alert.category === item.id && !alert.archived).length })), [sortedNotifications]);
  const severityStats = useMemo(() => ["critical", "high", "warning", "info"].map((severity) => ({ label: getSeverityLabel(severity), value: sortedNotifications.filter((item) => item.severity === severity && !item.archived).length, tone: severity })), [sortedNotifications]);
  const channelAnalytics = useMemo(() => { const channels = ["in-app", "sms", "email", "push"]; return channels.map((channel) => ({ key: channel, label: channelLabel(channel), value: sortedNotifications.filter((item) => (item.channels || []).includes(channel)).length })); }, [sortedNotifications]);
  const deliveryAnalytics = useMemo(() => deliveryStatuses.map((status) => ({ label: status, value: sortedNotifications.filter((item) => item.deliveryStatus === status).length })), [sortedNotifications]);
  const monthlyTrend = useMemo(() => { const monthMap = new Map(); sortedNotifications.forEach((item) => { const label = new Date(item.createdAt).toLocaleDateString("en-GB", { month: "short" }); monthMap.set(label, (monthMap.get(label) || 0) + 1); }); return [...monthMap.entries()].map(([label, value]) => ({ label, value })); }, [sortedNotifications]);
  const analyticsHighlights = useMemo(() => { const byCategory = categoryStats.reduce((best, current) => (current.value > best.value ? current : best), { label: "No alerts", value: 0 }); const byCropMap = new Map(); sortedNotifications.forEach((item) => { byCropMap.set(item.crop, (byCropMap.get(item.crop) || 0) + 1); }); const mostAffectedCrop = [...byCropMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Maize"; const confirmed = sortedNotifications.filter((item) => item.deliveryStatus === "Acknowledged" || item.ackStatus === "confirmed").length; const resolutionRate = sortedNotifications.length ? Math.round((confirmed / sortedNotifications.length) * 100) : 0; return { mostFrequentType: byCategory.label, mostAffectedCrop, resolutionRate }; }, [categoryStats, sortedNotifications]);
  const aiRecommendation = useMemo(() => recommendationSnippet(priorityAlert), [priorityAlert]);

  const syncAlertRecord = (updatedAlert) => { if (!updatedAlert?.id) return; setNotifications((current) => current.map((item) => (item.id === updatedAlert.id ? normalizeNotifications([updatedAlert], primaryFarm)[0] : item))); };

  const markAllAsRead = async () => {
    if (backendEnabled) { try { const nextAlerts = await phase1BackendService.notifications.markAllRead(backendFarmId); if (Array.isArray(nextAlerts) && nextAlerts.length > 0) { setNotifications(normalizeNotifications(nextAlerts, primaryFarm)); setStatusMessage("All active alerts marked as read."); return; } } catch (error) { console.error("Notifications mark-all-read failed:", error); } }
    setNotifications((current) => current.map((item) => ({ ...item, read: true, deliveryStatus: item.deliveryStatus === "Delivered" ? "Opened" : item.deliveryStatus }))); setStatusMessage("All active alerts marked as read.");
  };

  const markAsRead = async (id) => {
    if (backendEnabled) { try { const updated = await phase1BackendService.notifications.markRead(id); syncAlertRecord(updated); setStatusMessage("Alert marked as read."); return; } catch (error) { console.error("Notification read action failed:", error); } }
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true, deliveryStatus: item.deliveryStatus === "Delivered" ? "Opened" : item.deliveryStatus } : item))); setStatusMessage("Alert marked as read.");
  };

  const confirmAlert = async (id) => {
    if (backendEnabled) { try { const updated = await phase1BackendService.notifications.confirm(id); syncAlertRecord(updated); setStatusMessage("Alert confirmation recorded."); return; } catch (error) { console.error("Notification confirm action failed:", error); } }
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, ackStatus: "confirmed", read: true, deliveryStatus: "Acknowledged" } : item))); setStatusMessage("Alert confirmation recorded.");
  };

  const archiveAlert = async (id) => {
    if (backendEnabled) { try { const updated = await phase1BackendService.notifications.archive(id); syncAlertRecord(updated); setStatusMessage("Alert archived."); return; } catch (error) { console.error("Notification archive action failed:", error); } }
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, archived: true, read: true } : item))); setStatusMessage("Alert archived.");
  };

  const snoozeAlert = async (id) => {
    if (backendEnabled) { try { const updated = await phase1BackendService.notifications.snooze(id, { hours: 6 }); syncAlertRecord(updated); setStatusMessage("Alert snoozed for 6 hours."); return; } catch (error) { console.error("Notification snooze action failed:", error); } }
    const snoozedUntil = new Date(); snoozedUntil.setHours(snoozedUntil.getHours() + 6);
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: false, snoozedUntil: snoozedUntil.toISOString(), deliveryStatus: "Pending" } : item))); setStatusMessage("Alert snoozed for 6 hours.");
  };

  const updateFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); };
  const openRelatedModule = (path) => { navigate(path); };

  const uniqueSources = useMemo(() => [...new Set(sortedNotifications.map((n) => n.source))], [sortedNotifications]);
  const summaryCardMeta = useMemo(() => ({
    critical: { icon: TriangleAlert, desc: "Requires immediate attention" },
    weather: { icon: CloudRain, desc: "Weather condition alerts" },
    pests: { icon: Bug, desc: "Pest & disease warnings" },
    market: { icon: ShoppingCart, desc: "Market opportunity alerts" },
    system: { icon: Bell, desc: "Unread alert notifications" },
  }), []);
  const severityColor = (severity) => {
    if (severity === "critical") return "#dc2626";
    if (severity === "high") return "#ea580c";
    if (severity === "warning") return "#f59e0b";
    return "#16a34a";
  };
  const deliveryDotColor = (status) => {
    if (status === "Delivered") return "#16a34a";
    if (status === "Opened") return "#2563eb";
    if (status === "Acknowledged") return "#7c3aed";
    if (status === "Pending") return "#f59e0b";
    return "#dc2626";
  };
  const channelIcon = (key) => {
    if (key === "email") return Mail;
    if (key === "sms") return RadioTower;
    if (key === "push") return Siren;
    return Bell;
  };

  const lastUpdated = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <PageShell>
      <PageHeader
        title="Notification &amp; Alert Center"
        subtitle="Monitor weather, pest, market, irrigation, analytics, and system alerts."
        actions={
          <div className="notif-header-actions">
            <StatusBadge variant="success">Live</StatusBadge>
            <StatusBadge variant={backendEnabled ? "info" : "default"}>
              {backendEnabled ? "Backend" : "Local"}
            </StatusBadge>
          </div>
        }
      />

      {statusMessage ? <div className="notif-toast">{statusMessage}</div> : null}
      {backendLoading ? <div className="notif-loading">Loading notification command center...</div> : null}

      {/* Alert Summary Cards */}
      <div className="notif-summary-grid">
        {summaryCards.map((card) => {
          const meta = summaryCardMeta[card.tone];
          const Icon = meta?.icon || Bell;
          return (
            <div key={card.label} className={`notif-summary-card ${card.tone}`}>
              <div className={`notif-summary-icon ${card.tone}`}><Icon size={20} /></div>
              <div className="notif-summary-value">{card.value}</div>
              <div className="notif-summary-label">{card.label}</div>
              <div className="notif-summary-desc">{meta?.desc || ""}</div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="notif-toolbar">
        <div className="notif-toolbar-left">
          <div className="notif-search-wrap">
            <Search size={16} />
            <input
              type="text"
              className="notif-search-input"
              placeholder="Search alerts..."
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div className="notif-source-badges">
            {uniqueSources.slice(0, 4).map((source) => (
              <span key={source} className="notif-source-badge">{source}</span>
            ))}
          </div>
        </div>
        <div className="notif-toolbar-right">
          <span className="notif-last-updated">Updated {lastUpdated}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="notif-tabs-bar">
        <div className="notif-tabs-group">
          {["timeline", "history", "preferences"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`notif-pill ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "timeline" ? "Timeline View" : tab === "history" ? "History & Archive" : "Preferences"}
            </button>
          ))}
        </div>
        {activeTab !== "preferences" && (
          <div className="notif-filter-chips">
            {categoryDefinitions.map((item) => {
              const Icon = item.icon;
              return (
                <FilterChip key={item.id} active={categoryFilter === item.id} onClick={() => setCategoryFilter(item.id)} icon={Icon}>
                  {item.label}
                </FilterChip>
              );
            })}
          </div>
        )}
      </div>

      {activeTab === "preferences" ? (
        <div className="notif-preferences-list">
          <AppCard>
            <h3>Delivery Preferences</h3>
            <div className="notif-pref-items">
              {[{ key: "email", label: "Email Alerts", description: "Weekly digests and critical agricultural advisories." }, { key: "sms", label: "SMS Notifications", description: "Urgent weather, pest, and irrigation deadlines." }, { key: "push", label: "Push Notifications", description: "Real-time device delivery for in-field response." }, { key: "scheduledSummary", label: "Scheduled Summary Reports", description: "Morning command-center digest with combined module highlights." }].map((item) => (
                <div key={item.key} className="notif-pref-item">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </div>
                  <button
                    type="button"
                    className={`notif-toggle ${preferences.delivery[item.key] ? "on" : "off"}`}
                    onClick={() => setPreferences((current) => ({ ...current, delivery: { ...current.delivery, [item.key]: !current.delivery[item.key] } }))}
                  >
                    <span className="notif-toggle-knob" />
                  </button>
                </div>
              ))}
            </div>
          </AppCard>
          <AppCard>
            <h3>Category Preferences</h3>
            <div className="notif-pref-chips">
              {advancedPreferenceKeys.map((item) => (
                <FilterChip key={item.id} active={preferences.categories[item.id]} onClick={() => setPreferences((current) => ({ ...current, categories: { ...current.categories, [item.id]: !current.categories[item.id] } }))}>
                  {item.label}
                </FilterChip>
              ))}
            </div>
          </AppCard>
          <AppCard>
            <h3>Scheduled Summary Reports</h3>
            <div className="notif-pref-chips">
              {summaryFrequencies.map((item) => (
                <FilterChip key={item} active={preferences.summaries[item]} onClick={() => setPreferences((current) => ({ ...current, summaries: { ...current.summaries, [item]: !current.summaries[item] } }))}>
                  {item}
                </FilterChip>
              ))}
            </div>
            <p className="notif-pref-note">Summary reports combine weather, pest, market, irrigation, and AI guidance.</p>
            <ActionButton variant="primary" onClick={() => setStatusMessage("Notification preferences saved.")}>Save Settings</ActionButton>
          </AppCard>
        </div>
      ) : (
        <div className="notif-main-layout">
          <div className="notif-main-left">
            {/* Priority Action Center */}
            <AppCard className="notif-priority-card" style={{ borderLeft: `4px solid ${priorityAlert ? severityColor(priorityAlert.severity) : "var(--border)"}` }}>
              <div className="notif-priority-head">
                <div>
                  <h2>Priority Action Center</h2>
                  <p>Highest-severity alert requiring immediate attention</p>
                </div>
                <StatusBadge variant={priorityAlert?.severity || "default"}>
                  {priorityAlert ? getSeverityLabel(priorityAlert.severity) : "No active alert"}
                </StatusBadge>
              </div>
              {priorityAlert ? (
                <>
                  <div className="notif-priority-meta">
                    <div className="notif-priority-row">
                      <MapPin size={14} /><span>{priorityAlert.district} &middot; {priorityAlert.sector} &middot; {priorityAlert.crop}</span>
                    </div>
                  </div>
                  <div className="notif-priority-title">{priorityAlert.title}</div>
                  <div className="notif-priority-grid">
                    <div className="notif-priority-field">
                      <dt><Clock size={12} /> Deadline</dt>
                      <dd>{priorityAlert.deadline}</dd>
                    </div>
                    <div className="notif-priority-field">
                      <dt><Bot size={12} /> AI Confidence</dt>
                      <dd>{priorityAlert.confidence}%</dd>
                    </div>
                    <div className="notif-priority-field">
                      <dt><RadioTower size={12} /> Source</dt>
                      <dd>{priorityAlert.sourceLabel}</dd>
                    </div>
                    <div className="notif-priority-field">
                      <dt><CheckCircle2 size={12} /> Delivery</dt>
                      <dd className={`notif-delivery-${priorityAlert.deliveryStatus?.toLowerCase()}`}>{priorityAlert.deliveryStatus}</dd>
                    </div>
                    <div className="notif-priority-field">
                      <dt>Required Action</dt>
                      <dd>{priorityAlert.requiredAction}</dd>
                    </div>
                    <div className="notif-priority-field">
                      <dt>Crop Affected</dt>
                      <dd>{priorityAlert.crop}</dd>
                    </div>
                  </div>
                  <div className="notif-ai-panel">
                    <div className="notif-ai-header">
                      <Bot size={16} />
                      <strong>AI Recommendation</strong>
                      <StatusBadge variant="default">{aiRecommendation.confidence}% confidence</StatusBadge>
                    </div>
                    <div className="notif-ai-body">
                      <div className="notif-ai-row">
                        <dt>Recommended Action</dt>
                        <dd>{aiRecommendation.action}</dd>
                      </div>
                      <div className="notif-ai-row">
                        <dt>Explanation</dt>
                        <dd>{aiRecommendation.explanation}</dd>
                      </div>
                      <div className="notif-ai-row">
                        <dt>Deadline</dt>
                        <dd>{priorityAlert.deadline}</dd>
                      </div>
                    </div>
                    <div className="notif-ai-footer">
                      <ActionButton size="sm" variant="primary" onClick={() => openRelatedModule(priorityAlert.relatedModule)}>
                        <Eye size={14} /> <span>Open Module</span>
                      </ActionButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className="notif-priority-empty">
                  <strong>No high-priority alerts right now.</strong>
                  <p>Your current inbox is clear.</p>
                </div>
              )}
            </AppCard>

            {/* Active Alert Timeline */}
            <div className="notif-timeline-header">
              <h2>{activeTab === "history" ? "Alert Timeline History" : "Active Alert Timeline"}</h2>
              <ActionButton variant="ghost" size="sm" onClick={markAllAsRead}>Mark all as read</ActionButton>
            </div>
            {timelineGroups.map((group) => (
              <section key={group.label}>
                <div className="notif-group-label">{group.label}</div>
                {group.items.length ? (
                  <div className="notif-timeline-list">
                    {group.items.map((alert) => {
                      const Icon = alertIcon(alert.category);
                      return (
                        <article key={alert.id} className={`notif-alert-card ${alert.severity}`}>
                          <div className="notif-alert-icon-wrap">
                            <div className={`notif-alert-icon-badge ${alert.severity}`}><Icon size={16} /></div>
                            <div className="notif-alert-time">{formatTimeLabel(alert.createdAt)}</div>
                          </div>
                          <div className="notif-alert-body-wrap">
                            <div className="notif-alert-title-row">
                              <h3>{alert.title}</h3>
                              <div className="notif-alert-badges">
                                <span className={`notif-sev-badge ${alert.severity}`}>{getSeverityLabel(alert.severity)}</span>
                                <span className={`notif-status-badge ${alert.ackStatus}`}>{getAckLabel(alert.ackStatus)}</span>
                                <span className="notif-cat-badge">{categoryLabel(alert.category)}</span>
                              </div>
                            </div>
                            <div className="notif-alert-meta-row">
                              <span className="notif-alert-source"><RadioTower size={12} /> {alert.source}</span>
                              <span className="notif-alert-crop"><Leaf size={12} /> {alert.crop}</span>
                            </div>
                            <p className="notif-alert-desc">{alert.body}</p>
                            <div className="notif-alert-action-panel">
                              <div className="notif-action-panel-head">
                                <Info size={12} />
                                <strong>Required Action</strong>
                              </div>
                              <p>{alert.requiredAction}</p>
                              <div className="notif-action-panel-meta">
                                <span><Clock size={11} /> {alert.deadline}</span>
                                <span><MapPin size={11} /> {alert.district}</span>
                              </div>
                            </div>
                            <div className="notif-alert-channels">
                              {(alert.channels || []).map((channel) => (
                                <span key={`${alert.id}-${channel}`} className="notif-channel-badge">{channelLabel(channel)}</span>
                              ))}
                            </div>
                            <div className="notif-alert-actions">
                              <ActionButton size="sm" variant="secondary" onClick={() => markAsRead(alert.id)}>Mark Read</ActionButton>
                              <ActionButton size="sm" variant="primary" onClick={() => confirmAlert(alert.id)}>Confirm</ActionButton>
                              <ActionButton size="sm" variant="ghost" onClick={() => archiveAlert(alert.id)}>Archive</ActionButton>
                              <ActionButton size="sm" variant="ghost" onClick={() => snoozeAlert(alert.id)}>Snooze</ActionButton>
                              <ActionButton size="sm" variant="ghost" onClick={() => openRelatedModule(alert.relatedModule)}>Module</ActionButton>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="notif-empty">
                    <strong>No alerts in {group.label.toLowerCase()}.</strong>
                    <p>Change the category filter or search filters.</p>
                  </div>
                )}
              </section>
            ))}
          </div>

          <aside className="notif-sidebar">
            {/* Alert Analytics */}
            <AppCard>
              <div className="notif-sidebar-head"><BarChart size={16} /><h3>Alert Analytics</h3></div>
              <div className="notif-sidebar-section">
                <h4>By Category</h4>
                {categoryStats.map((item) => {
                  const def = categoryDefinitions.find((d) => d.label === item.label);
                  const CatIcon = def?.icon || ShieldAlert;
                  return (
                    <div key={item.label} className="notif-stat-row">
                      <div className="notif-stat-left"><CatIcon size={14} /><span>{item.label}</span></div>
                      <span className="notif-stat-count">{item.value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="notif-sidebar-section">
                <h4>By Severity</h4>
                {severityStats.map((item) => (
                  <div key={item.label} className="notif-stat-row">
                    <div className="notif-stat-left">
                      <span className={`notif-sev-dot ${item.tone}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className={`notif-stat-count ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="notif-sidebar-section">
                <h4>Monthly Trends</h4>
                <div className="notif-monthly-chart">
                  {monthlyTrend.length > 0 ? monthlyTrend.map((item) => {
                    const maxVal = Math.max(...monthlyTrend.map((t) => t.value), 1);
                    return (
                      <div key={item.label} className="notif-monthly-bar-wrap">
                        <div className="notif-monthly-bar" style={{ height: `${(item.value / maxVal) * 80}px` }} />
                        <span>{item.label}</span>
                      </div>
                    );
                  }) : (
                    <div className="notif-chart-placeholder"><BarChart size={24} /><span>No trend data</span></div>
                  )}
                </div>
              </div>
              <div className="notif-sidebar-section">
                <h4>Highlights</h4>
                <div className="notif-stat-row"><div className="notif-stat-left"><TrendingUp size={14} /><span>Most Frequent</span></div><span className="notif-stat-count">{analyticsHighlights.mostFrequentType}</span></div>
                <div className="notif-stat-row"><div className="notif-stat-left"><Leaf size={14} /><span>Most Affected Crop</span></div><span className="notif-stat-count">{analyticsHighlights.mostAffectedCrop}</span></div>
                <div className="notif-stat-row"><div className="notif-stat-left"><CheckCircle2 size={14} /><span>Resolution Rate</span></div><span className="notif-stat-count">{analyticsHighlights.resolutionRate}%</span></div>
              </div>
            </AppCard>

            {/* Channels */}
            <AppCard>
              <div className="notif-sidebar-head"><MessageSquareText size={16} /><h3>Channels</h3></div>
              <div className="notif-channel-grid">
                {channelAnalytics.map((item) => {
                  const ChIcon = channelIcon(item.key);
                  return (
                    <div key={item.key} className="notif-channel-card">
                      <div className="notif-channel-icon-wrap"><ChIcon size={18} /></div>
                      <strong className="notif-channel-label">{item.label}</strong>
                      <span className="notif-channel-count">{item.value} alerts</span>
                      <span className="notif-channel-status">{item.value > 0 ? "Active" : "Inactive"}</span>
                    </div>
                  );
                })}
              </div>
            </AppCard>

            {/* Delivery Status */}
            <AppCard>
              <div className="notif-sidebar-head"><CheckCircle2 size={16} /><h3>Delivery Status</h3></div>
              {deliveryAnalytics.map((item) => (
                <div key={item.label} className="notif-delivery-row">
                  <div className="notif-delivery-left">
                    <span className="notif-delivery-dot" style={{ background: deliveryDotColor(item.label) }} />
                    <span className="notif-delivery-label">{item.label}</span>
                  </div>
                  <span className="notif-delivery-value">{item.value}</span>
                </div>
              ))}
            </AppCard>

            {/* SMS Commands */}
            <AppCard>
              <div className="notif-sidebar-head"><RadioTower size={16} /><h3>SMS Commands</h3></div>
              <p className="notif-sidebar-note">Send commands to the command center via SMS</p>
              {smsCommands.map((item) => (
                <div key={item.command} className="notif-sms-card">
                  <code className="notif-sms-code">{item.command}</code>
                  <span className="notif-sms-desc">{item.response}</span>
                </div>
              ))}
            </AppCard>

            {/* Alert Context */}
            <AppCard>
              <div className="notif-sidebar-head"><Info size={16} /><h3>Alert Context</h3></div>
              <p className="notif-context-text">
                {DEMO_MODE ? `Demo alerts for ${primaryFarm.name} in ${primaryFarm.district}.` : "Live integrated alert streams."}
              </p>
              <ActionButton variant="secondary" size="sm" onClick={() => openRelatedModule("/dashboard")}>
                <ExternalLink size={14} />
                <span>Dashboard</span>
              </ActionButton>
            </AppCard>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
