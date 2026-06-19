import {
  Archive,
  Bell,
  Bot,
  Bug,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Filter,
  Leaf,
  Mail,
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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmerData } from "../../context/FarmerDataContext";

const NOTIFICATION_STORAGE_KEY = "agri-feed-notification-center-v3";
const DEMO_MODE = true;

const severityRank = {
  critical: 0,
  high: 1,
  warning: 2,
  info: 3,
};

const categoryDefinitions = [
  { id: "all", label: "All Alerts", icon: Bell },
  { id: "weather", label: "Weather", icon: CloudRain },
  { id: "pests", label: "Pests & Diseases", icon: Bug },
  { id: "market", label: "Market", icon: ShoppingCart },
  { id: "irrigation", label: "Irrigation", icon: Sprout },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "system", label: "System", icon: ShieldAlert },
];

const escalationSteps = [
  "Farmer",
  "Extension Officer",
  "District Agronomist",
  "National Alert Center",
];

const deliveryStatuses = ["Delivered", "Opened", "Acknowledged", "Pending", "Failed"];
const summaryFrequencies = ["Daily", "Weekly", "Monthly"];
const districtOptions = [
  "All Districts",
  "Kicukiro District",
  "Bugesera District",
  "Musanze District",
  "Rwamagana District",
  "Huye District",
  "Rubavu District",
];

const advancedPreferenceKeys = [
  { id: "weather", label: "Weather Alerts" },
  { id: "pest", label: "Pest Alerts" },
  { id: "market", label: "Market Alerts" },
  { id: "irrigation", label: "Irrigation Alerts" },
  { id: "analytics", label: "Analytics Alerts" },
];

const smsCommands = [
  { command: "ALERTS", response: "Returns the latest critical and high priority advisories for the active farm." },
  { command: "WEATHER", response: "Returns the latest weather warning, rainfall outlook, and next irrigation recommendation." },
  { command: "PEST", response: "Returns nearby outbreak risk, likely pest pressure, and the recommended field action." },
  { command: "MARKET MAIZE", response: "Returns nearest market prices and AI selling recommendation for maize." },
];

const templateSeed = [
  {
    id: "weather-template",
    title: "Weather Alerts",
    category: "Weather",
    description: "Auto-generates advisories for rain deficits, heavy rainfall, strong wind, and heat stress windows.",
    status: "Published",
    lastUpdated: "19 Jun 2026",
  },
  {
    id: "pest-template",
    title: "Pest Outbreaks",
    category: "Pest",
    description: "Used when weather and farmer reports indicate increasing disease or insect pressure.",
    status: "Published",
    lastUpdated: "18 Jun 2026",
  },
  {
    id: "market-template",
    title: "Market Opportunities",
    category: "Market",
    description: "Shares buyer demand signals, price alert thresholds, and best market routing advice.",
    status: "Review",
    lastUpdated: "17 Jun 2026",
  },
  {
    id: "irrigation-template",
    title: "Irrigation Reminders",
    category: "Irrigation",
    description: "Combines soil moisture, ET, and rainfall outlook to trigger irrigation windows.",
    status: "Published",
    lastUpdated: "19 Jun 2026",
  },
  {
    id: "harvest-template",
    title: "Harvest Notifications",
    category: "Harvest",
    description: "Flags maturity windows, post-harvest weather risk, and expected market timing.",
    status: "Draft",
    lastUpdated: "16 Jun 2026",
  },
];

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
}

function isoDaysAgo(days, hour = 8) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function channelLabel(channel) {
  if (channel === "sms") return "SMS";
  if (channel === "email") return "Email";
  if (channel === "push") return "Push";
  return "In-App";
}

function categoryLabel(category) {
  return categoryDefinitions.find((item) => item.id === category)?.label || "System";
}

function alertIcon(category) {
  if (category === "weather") return CloudRain;
  if (category === "pests") return Bug;
  if (category === "market") return ShoppingCart;
  if (category === "irrigation") return Sprout;
  if (category === "analytics") return TrendingUp;
  return ShieldAlert;
}

function getSeverityLabel(severity) {
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  if (severity === "warning") return "Warning";
  return "Info";
}

function getAckLabel(status) {
  if (status === "confirmed") return "Confirmed";
  if (status === "expired") return "Expired";
  return "Pending";
}

function getTimelineGroup(isoString) {
  const created = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (created >= today) return "Today";
  if (created >= yesterday) return "Yesterday";
  return "Earlier";
}

function formatTimeLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function sortAlerts(alerts) {
  return [...alerts].sort((left, right) => {
    const severityDiff = (severityRank[left.severity] ?? 9) - (severityRank[right.severity] ?? 9);
    if (severityDiff !== 0) return severityDiff;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function createBaseNotifications(farm) {
  const farmName = farm?.name || "Gatenga Demonstration Plot";
  const district = farm?.district || "Kicukiro District";
  const sector = farm?.sector || "Gatenga Sector";
  const crop = farm?.primaryCrop || farm?.cropHistory?.[0]?.name || "Maize";
  return [
    {
      id: "weather-critical-gatenga",
      category: "weather",
      severity: "critical",
      source: "Weather API",
      sourceLabel: "Live Weather Data",
      title: `Severe moisture deficit detected in ${farmName}`,
      body: "No effective rainfall is expected over the next 7 days and field moisture has dropped below the comfort range for the current crop stage.",
      requiredAction: "Start irrigation within the next 12 hours and review mulch coverage.",
      recommendedAction: "Open the irrigation plan and trigger the next irrigation block today.",
      explanation: "Open-Meteo rainfall totals remain below the crop comfort range while evapotranspiration remains elevated.",
      deadline: "Today, 18:00",
      confidence: 91,
      channels: ["in-app", "sms", "push"],
      createdAt: isoDaysAgo(0, 7),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Delivered",
      relatedModule: "/irrigation-fertilizer",
      district,
      sector,
      crop,
      escalationLevel: 1,
      escalationPath: escalationSteps,
    },
    {
      id: "pest-high-aphid",
      category: "pests",
      severity: "high",
      source: "AI Engine",
      sourceLabel: "Demo Pest Data",
      title: "Aphid outbreak pressure increasing near Gatenga Sector",
      body: "Humidity above 78% and recent canopy density reports increase aphid development risk in maize and beans across nearby plots.",
      requiredAction: "Inspect edge rows, check trap counts, and prepare targeted IPM response.",
      recommendedAction: "Inspect hotspot rows and prepare neem-based or selective control depending on trap count.",
      explanation: "The prediction combines symptom reports, weather pressure, and prior outbreak history from nearby farms.",
      deadline: "Tomorrow, 10:00",
      confidence: 87,
      channels: ["in-app", "email"],
      createdAt: isoDaysAgo(0, 10),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Opened",
      relatedModule: "/pest-prediction",
      district,
      sector,
      crop,
      escalationLevel: 2,
      escalationPath: escalationSteps,
    },
    {
      id: "market-maize-opportunity",
      category: "market",
      severity: "info",
      source: "Market Feed",
      sourceLabel: "Demo Market Data",
      title: "Maize demand rising in Kigali collection markets",
      body: "Buyer activity has improved in Kicukiro and Nyarugenge routes, with slightly stronger wholesale demand for cleaned grain lots.",
      requiredAction: "Compare transport cost against expected selling price before dispatch.",
      recommendedAction: "Hold grain for 3-5 days while monitoring Kigali market opportunity score.",
      explanation: "Demand and projected price movement are improving faster than transport costs in nearby markets.",
      deadline: "Within 3 days",
      confidence: 79,
      channels: ["in-app", "email"],
      createdAt: isoDaysAgo(1, 9),
      read: true,
      archived: false,
      ackStatus: "confirmed",
      deliveryStatus: "Acknowledged",
      relatedModule: "/market-intelligence",
      district,
      sector,
      crop,
      escalationLevel: 0,
      escalationPath: escalationSteps,
    },
    {
      id: "irrigation-reminder",
      category: "irrigation",
      severity: "warning",
      source: "Soil Sensor",
      sourceLabel: "Local Data",
      title: "Irrigation reminder window approaching",
      body: "The next irrigation window aligns with low wind speed and lower evaporative loss during the early morning period.",
      requiredAction: "Prepare irrigation set and confirm pump readiness before sunrise.",
      recommendedAction: "Apply the recommended irrigation block before 06:00 and record the completed cycle.",
      explanation: "Soil moisture dropped below the preferred trigger while wind and temperature conditions favor morning irrigation efficiency.",
      deadline: "Tomorrow, 05:30",
      confidence: 83,
      channels: ["in-app", "push"],
      createdAt: isoDaysAgo(1, 14),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Pending",
      relatedModule: "/irrigation-fertilizer",
      district,
      sector,
      crop,
      escalationLevel: 0,
      escalationPath: escalationSteps,
    },
    {
      id: "analytics-yield-drift",
      category: "analytics",
      severity: "warning",
      source: "AI Engine",
      sourceLabel: "Local Data",
      title: "Yield efficiency is trending below district benchmark",
      body: "Recent cost-weighted output suggests this farm may finish the cycle slightly below the district average unless input timing improves.",
      requiredAction: "Review nutrient timing and irrigation consistency this week.",
      recommendedAction: "Follow the advisory sequence for fertilizer timing and check irrigation compliance.",
      explanation: "The AI engine compared current cost-output behavior with local benchmark trends and recent field decisions.",
      deadline: "Within 2 days",
      confidence: 76,
      channels: ["in-app", "email"],
      createdAt: isoDaysAgo(2, 11),
      read: true,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Opened",
      relatedModule: "/analytics",
      district,
      sector,
      crop,
      escalationLevel: 1,
      escalationPath: escalationSteps,
    },
    {
      id: "farmer-report-followup",
      category: "system",
      severity: "high",
      source: "Farmer Report",
      sourceLabel: "Local Data",
      title: "Field report requires extension follow-up",
      body: "A submitted field note indicates abnormal leaf yellowing near the lower terrace and requires expert review.",
      requiredAction: "Open the farmer report, verify symptoms, and attach a soil or pest follow-up action.",
      recommendedAction: "Escalate the report to the extension officer and attach field photos.",
      explanation: "Farmer reports receive higher urgency when they align with weather stress and recent nutrient warnings.",
      deadline: "Today, 16:00",
      confidence: 81,
      channels: ["in-app", "sms", "email"],
      createdAt: isoDaysAgo(0, 12),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Failed",
      relatedModule: "/community",
      district,
      sector,
      crop,
      escalationLevel: 2,
      escalationPath: escalationSteps,
    },
  ];
}

function normalizeNotifications(rawNotifications, farm) {
  if (!Array.isArray(rawNotifications) || rawNotifications.length === 0) {
    return createBaseNotifications(farm);
  }

  return rawNotifications.map((item, index) => ({
    district: farm?.district || "Kicukiro District",
    sector: farm?.sector || "Gatenga Sector",
    crop: farm?.primaryCrop || "Maize",
    source: "System Notifications",
    sourceLabel: "Local Data",
    requiredAction: "Review the related module for the next response step.",
    recommendedAction: "Open the related module and confirm the field action.",
    explanation: "This advisory is being presented in frontend-only demonstration mode.",
    confidence: 75,
    channels: ["in-app"],
    deliveryStatus: "Delivered",
    escalationLevel: 0,
    escalationPath: escalationSteps,
    ackStatus: "pending",
    relatedModule: "/dashboard",
    read: false,
    archived: false,
    ...item,
    id: item.id || `notification-${index + 1}`,
  }));
}

function buildDefaultPreferences(stored) {
  return {
    delivery: stored?.delivery || {
      email: true,
      sms: true,
      push: true,
      scheduledSummary: true,
    },
    categories: stored?.categories || {
      weather: true,
      pest: true,
      market: true,
      irrigation: true,
      analytics: true,
    },
    summaries: stored?.summaries || {
      Daily: true,
      Weekly: true,
      Monthly: false,
    },
  };
}

function recommendationSnippet(alert) {
  return {
    action: alert?.recommendedAction || "Open related module for next advisory step.",
    confidence: alert?.confidence || 0,
    explanation: alert?.explanation || "Advice generated from local demo alert conditions.",
  };
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { currentFarms } = useFarmerData();
  const primaryFarm = currentFarms?.[0] || {
    name: "Gatenga Demonstration Plot",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    primaryCrop: "Maize",
  };
  const farmSignature = `${primaryFarm.name}|${primaryFarm.district}|${primaryFarm.sector}|${primaryFarm.primaryCrop || "Maize"}`;
  const stored = useMemo(() => loadStoredState(), []);

  const [activeTab, setActiveTab] = useState(stored.activeTab || "timeline");
  const [categoryFilter, setCategoryFilter] = useState(stored.categoryFilter || "all");
  const [filters, setFilters] = useState(
    stored.filters || {
      search: "",
      severity: "all",
      district: primaryFarm.district || "All Districts",
      crop: "all",
      source: "all",
      status: "all",
      dateWindow: "all",
    }
  );
  const [preferences, setPreferences] = useState(buildDefaultPreferences(stored.preferences));
  const [notifications, setNotifications] = useState(
    normalizeNotifications(stored.notifications, primaryFarm)
  );
  const [templates, setTemplates] = useState(stored.templates || templateSeed);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    saveStoredState({
      activeTab,
      categoryFilter,
      filters,
      preferences,
      notifications,
      templates,
    });
  }, [activeTab, categoryFilter, filters, preferences, notifications, templates]);

  useEffect(() => {
    setNotifications((current) => {
      if (!Array.isArray(current) || current.length === 0) {
        return createBaseNotifications(primaryFarm);
      }

      let changed = false;
      const next = current.map((item) => {
        const updated = {
          ...item,
          district: primaryFarm.district || item.district,
          sector: primaryFarm.sector || item.sector,
          crop: primaryFarm.primaryCrop || item.crop,
        };
        if (
          updated.district !== item.district ||
          updated.sector !== item.sector ||
          updated.crop !== item.crop
        ) {
          changed = true;
        }
        return updated;
      });

      return changed ? next : current;
    });
  }, [farmSignature]);

  useEffect(() => {
    if (!statusMessage) return;
    const timeoutId = window.setTimeout(() => setStatusMessage(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const sortedNotifications = useMemo(() => sortAlerts(notifications), [notifications]);

  const sourceOptions = useMemo(() => {
    return ["all", ...new Set(sortedNotifications.map((item) => item.source))];
  }, [sortedNotifications]);

  const cropOptions = useMemo(() => {
    return ["all", ...new Set(sortedNotifications.map((item) => item.crop).filter(Boolean))];
  }, [sortedNotifications]);

  const filteredNotifications = useMemo(() => {
    const base =
      activeTab === "history"
        ? sortedNotifications.filter((item) => item.read || item.archived || item.ackStatus !== "pending")
        : sortedNotifications.filter((item) => !item.archived);

    return base.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (filters.search) {
        const value = `${item.title} ${item.body} ${item.requiredAction} ${item.crop} ${item.district}`.toLowerCase();
        if (!value.includes(filters.search.toLowerCase())) return false;
      }
      if (filters.severity !== "all" && item.severity !== filters.severity) return false;
      if (filters.district !== "All Districts" && item.district !== filters.district) return false;
      if (filters.crop !== "all" && item.crop !== filters.crop) return false;
      if (filters.source !== "all" && item.source !== filters.source) return false;
      if (filters.status !== "all" && item.deliveryStatus !== filters.status) return false;
      if (filters.dateWindow !== "all") {
        const created = new Date(item.createdAt);
        const now = new Date();
        const days =
          filters.dateWindow === "today"
            ? 0
            : filters.dateWindow === "7d"
              ? 7
              : filters.dateWindow === "30d"
                ? 30
                : 365;
        if (days === 0 && created.toDateString() !== now.toDateString()) return false;
        if (days > 0) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          if (created < cutoff) return false;
        }
      }
      return true;
    });
  }, [activeTab, categoryFilter, filters, sortedNotifications]);

  const timelineGroups = useMemo(() => {
    return ["Today", "Yesterday", "Earlier"].map((label) => ({
      label,
      items: filteredNotifications.filter((item) => getTimelineGroup(item.createdAt) === label),
    }));
  }, [filteredNotifications]);

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

  const priorityAlert = useMemo(() => {
    return sortAlerts(
      sortedNotifications.filter((item) => !item.archived && item.ackStatus !== "confirmed")
    )[0];
  }, [sortedNotifications]);

  const categoryStats = useMemo(() => {
    return categoryDefinitions
      .filter((item) => item.id !== "all")
      .map((item) => ({
        label: item.label,
        value: sortedNotifications.filter((alert) => alert.category === item.id && !alert.archived).length,
      }));
  }, [sortedNotifications]);

  const severityStats = useMemo(() => {
    return ["critical", "high", "warning", "info"].map((severity) => ({
      label: getSeverityLabel(severity),
      value: sortedNotifications.filter((item) => item.severity === severity && !item.archived).length,
      tone: severity,
    }));
  }, [sortedNotifications]);

  const channelAnalytics = useMemo(() => {
    const channels = ["in-app", "sms", "email", "push"];
    return channels.map((channel) => ({
      key: channel,
      label: channelLabel(channel),
      value: sortedNotifications.filter((item) => item.channels.includes(channel)).length,
    }));
  }, [sortedNotifications]);

  const deliveryAnalytics = useMemo(() => {
    return deliveryStatuses.map((status) => ({
      label: status,
      value: sortedNotifications.filter((item) => item.deliveryStatus === status).length,
    }));
  }, [sortedNotifications]);

  const monthlyTrend = useMemo(() => {
    const monthMap = new Map();
    sortedNotifications.forEach((item) => {
      const label = new Date(item.createdAt).toLocaleDateString("en-GB", { month: "short" });
      monthMap.set(label, (monthMap.get(label) || 0) + 1);
    });
    return [...monthMap.entries()].map(([label, value]) => ({ label, value }));
  }, [sortedNotifications]);

  const analyticsHighlights = useMemo(() => {
    const byCategory = categoryStats.reduce((best, current) => (current.value > best.value ? current : best), {
      label: "No alerts",
      value: 0,
    });
    const byCropMap = new Map();
    sortedNotifications.forEach((item) => {
      byCropMap.set(item.crop, (byCropMap.get(item.crop) || 0) + 1);
    });
    const mostAffectedCrop = [...byCropMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Maize";
    const confirmed = sortedNotifications.filter((item) => item.deliveryStatus === "Acknowledged" || item.ackStatus === "confirmed").length;
    const resolutionRate = sortedNotifications.length ? Math.round((confirmed / sortedNotifications.length) * 100) : 0;

    return {
      mostFrequentType: byCategory.label,
      mostAffectedCrop,
      resolutionRate,
    };
  }, [categoryStats, sortedNotifications]);

  const aiRecommendation = useMemo(() => recommendationSnippet(priorityAlert), [priorityAlert]);

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
        deliveryStatus: item.deliveryStatus === "Delivered" ? "Opened" : item.deliveryStatus,
      }))
    );
    setStatusMessage("All active alerts marked as read.");
  };

  const updateAlert = (id, updater, message) => {
    setNotifications((current) => current.map((item) => (item.id === id ? updater(item) : item)));
    setStatusMessage(message);
  };

  const markAsRead = (id) => {
    updateAlert(
      id,
      (item) => ({ ...item, read: true, deliveryStatus: item.deliveryStatus === "Delivered" ? "Opened" : item.deliveryStatus }),
      "Alert marked as read."
    );
  };

  const confirmAlert = (id) => {
    updateAlert(
      id,
      (item) => ({ ...item, ackStatus: "confirmed", read: true, deliveryStatus: "Acknowledged" }),
      "Alert confirmation recorded."
    );
  };

  const archiveAlert = (id) => {
    updateAlert(id, (item) => ({ ...item, archived: true, read: true }), "Alert archived.");
  };

  const snoozeAlert = (id) => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 6);
    updateAlert(
      id,
      (item) => ({ ...item, read: false, snoozedUntil: snoozedUntil.toISOString(), deliveryStatus: "Pending" }),
      "Alert snoozed for 6 hours."
    );
  };

  const toggleDeliveryOption = (key) => {
    setPreferences((current) => ({
      ...current,
      delivery: { ...current.delivery, [key]: !current.delivery[key] },
    }));
  };

  const toggleCategoryOption = (key) => {
    setPreferences((current) => ({
      ...current,
      categories: { ...current.categories, [key]: !current.categories[key] },
    }));
  };

  const toggleSummaryFrequency = (label) => {
    setPreferences((current) => ({
      ...current,
      summaries: { ...current.summaries, [label]: !current.summaries[label] },
    }));
  };

  const savePreferences = () => {
    setStatusMessage("Notification preferences and summary schedules saved locally.");
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const updateTemplateStatus = (id) => {
    setTemplates((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "Published" ? "Review" : item.status === "Review" ? "Draft" : "Published",
              lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            }
          : item
      )
    );
    setStatusMessage("Notification template status updated locally.");
  };

  const openRelatedModule = (path) => {
    navigate(path);
  };

  return (
    <section className="management-page prototype-alert-page">
      <div className="prototype-alert-main standalone prototype-alert-center-page">
        <div className="page-title-block prototype-alert-title">
          <h1>Notification &amp; Alert Center</h1>
          <p>Professional agricultural command center for alert delivery, escalation, AI advisories, and multi-channel farmer communication.</p>
        </div>

        <div className="regional-source-row">
          <span className="regional-source-badge weather">Live Weather Data</span>
          <span className="regional-source-badge pests">Demo Pest Data</span>
          <span className="regional-source-badge demo">Demo Market Data</span>
          <span className="regional-source-badge local">Local Data</span>
        </div>

        {statusMessage ? (
          <div className="prototype-alert-status-banner" role="status">
            {statusMessage}
          </div>
        ) : null}

        <div className="prototype-alert-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className={`prototype-panel prototype-alert-summary-card ${card.tone}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>

        <div className="prototype-alert-tabs">
          <button type="button" className={activeTab === "timeline" ? "active" : ""} onClick={() => setActiveTab("timeline")}>
            Timeline View
          </button>
          <button type="button" className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
            History & Archive
          </button>
          <button type="button" className={activeTab === "preferences" ? "active" : ""} onClick={() => setActiveTab("preferences")}>
            Preferences
          </button>
        </div>

        <div className="prototype-alert-filter-row">
          {categoryDefinitions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={categoryFilter === item.id ? "prototype-alert-filter-chip active" : "prototype-alert-filter-chip"}
                onClick={() => setCategoryFilter(item.id)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="prototype-panel prototype-alert-advanced-bar">
          <div className="prototype-alert-advanced-head">
            <div>
              <h2>Advanced Search &amp; Filters</h2>
              <p>Filter alerts by date, severity, district, crop, source, and delivery status.</p>
            </div>
            <div className="prototype-alert-filter-title">
              <Filter size={16} />
              <span>Frontend-only demo mode</span>
            </div>
          </div>

          <div className="prototype-alert-advanced-filters">
            <label className="prototype-alert-search-field">
              <Search size={16} />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search alerts, crops, districts, or actions..."
              />
            </label>

            <select value={filters.severity} onChange={(event) => updateFilter("severity", event.target.value)}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select value={filters.district} onChange={(event) => updateFilter("district", event.target.value)}>
              {districtOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={filters.crop} onChange={(event) => updateFilter("crop", event.target.value)}>
              <option value="all">All Crops</option>
              {cropOptions.filter((item) => item !== "all").map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={filters.source} onChange={(event) => updateFilter("source", event.target.value)}>
              <option value="all">All Sources</option>
              {sourceOptions.filter((item) => item !== "all").map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="all">All Statuses</option>
              {deliveryStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={filters.dateWindow} onChange={(event) => updateFilter("dateWindow", event.target.value)}>
              <option value="all">Any Date</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>

        <div className="prototype-alert-grid modern">
          <div className="prototype-alert-main-column">
            <article className="prototype-panel prototype-alert-priority-card">
              <div className="prototype-alert-card-headline">
                <div>
                  <h2>Priority Action Center</h2>
                  <p>Highest-severity alert requiring immediate farmer attention.</p>
                </div>
                <div className={`prototype-alert-severity-pill ${priorityAlert?.severity || "info"}`}>
                  {priorityAlert ? getSeverityLabel(priorityAlert.severity) : "No active alert"}
                </div>
              </div>

              {priorityAlert ? (
                <>
                  <div className="prototype-alert-priority-grid">
                    <div>
                      <span className="prototype-alert-meta-label">Highest Severity Alert</span>
                      <strong>{priorityAlert.title}</strong>
                    </div>
                    <div>
                      <span className="prototype-alert-meta-label">Required Action</span>
                      <strong>{priorityAlert.requiredAction}</strong>
                    </div>
                    <div>
                      <span className="prototype-alert-meta-label">Recommended Deadline</span>
                      <strong>{priorityAlert.deadline}</strong>
                    </div>
                    <div>
                      <span className="prototype-alert-meta-label">AI Confidence Score</span>
                      <strong>{priorityAlert.confidence}%</strong>
                    </div>
                  </div>

                  <div className="prototype-panel prototype-alert-ai-panel">
                    <div className="prototype-alert-ai-head">
                      <div>
                        <h3>AI Recommendation Integration</h3>
                        <p>Recommendation generated from the alert source, farm context, and recent field conditions.</p>
                      </div>
                      <div className="prototype-alert-ai-badge">
                        <Bot size={16} />
                        <span>{aiRecommendation.confidence}% confidence</span>
                      </div>
                    </div>
                    <div className="prototype-alert-ai-grid">
                      <div>
                        <span className="prototype-alert-meta-label">Recommended Action</span>
                        <strong>{aiRecommendation.action}</strong>
                      </div>
                      <div>
                        <span className="prototype-alert-meta-label">Explanation</span>
                        <strong>{aiRecommendation.explanation}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="prototype-panel prototype-alert-escalation-panel">
                    <div className="prototype-alert-channel-head">
                      <TriangleAlert size={18} />
                      <h3>Alert Escalation Workflow</h3>
                    </div>
                    <div className="prototype-alert-escalation-row">
                      {priorityAlert.escalationPath.map((step, index) => (
                        <div
                          key={`${priorityAlert.id}-${step}`}
                          className={
                            index <= priorityAlert.escalationLevel
                              ? "prototype-alert-escalation-step active"
                              : "prototype-alert-escalation-step"
                          }
                        >
                          <span>{step}</span>
                          {index < priorityAlert.escalationPath.length - 1 ? <ChevronRight size={14} /> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="prototype-empty-state-card">
                  <strong>No high-priority alerts right now.</strong>
                  <p>Your current inbox is clear and no urgent farmer action is required.</p>
                </div>
              )}
            </article>

            {activeTab === "preferences" ? (
              <div className="prototype-alert-preferences-stack">
                <article className="prototype-panel prototype-alert-preferences enhanced">
                  <div className="prototype-alert-section-head">
                    <h2>Advanced Notification Preferences</h2>
                  </div>

                  <div className="prototype-alert-toggle-list">
                    {[
                      { key: "email", label: "Email Alerts", description: "Weekly digests and critical agricultural advisories." },
                      { key: "sms", label: "SMS Notifications", description: "Urgent weather, pest, and irrigation deadlines." },
                      { key: "push", label: "Push Notifications", description: "Real-time device delivery for in-field response." },
                      { key: "scheduledSummary", label: "Scheduled Summary Reports", description: "Morning command-center digest with combined module highlights." },
                    ].map((item) => (
                      <div key={item.key} className="prototype-alert-toggle-row">
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
                        </div>
                        <button
                          type="button"
                          className={preferences.delivery[item.key] ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                          onClick={() => toggleDeliveryOption(item.key)}
                        >
                          <i />
                        </button>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="prototype-panel prototype-alert-preferences enhanced">
                  <div className="prototype-alert-section-head">
                    <h2>Category Preferences</h2>
                  </div>
                  <div className="prototype-alert-mini-grid">
                    {advancedPreferenceKeys.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={preferences.categories[item.id] ? "prototype-alert-pref-chip active" : "prototype-alert-pref-chip"}
                        onClick={() => toggleCategoryOption(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </article>

                <article className="prototype-panel prototype-alert-preferences enhanced">
                  <div className="prototype-alert-section-head">
                    <h2>Scheduled Summary Reports</h2>
                  </div>
                  <div className="prototype-alert-mini-grid">
                    {summaryFrequencies.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={preferences.summaries[item] ? "prototype-alert-pref-chip active" : "prototype-alert-pref-chip"}
                        onClick={() => toggleSummaryFrequency(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <p className="prototype-alert-help-copy">Summary reports combine weather, pest, market, irrigation, and AI guidance for demonstration mode.</p>
                </article>

                <button type="button" className="prototype-alert-save-button" onClick={savePreferences}>
                  Save Settings
                </button>
              </div>
            ) : (
              <article className="prototype-alert-timeline">
                <div className="prototype-alert-list-head">
                  <h2>{activeTab === "history" ? "Alert Timeline History" : "Active Alert Timeline"}</h2>
                  <button type="button" onClick={markAllAsRead}>Mark all as read</button>
                </div>

                {timelineGroups.map((group) => (
                  <section key={group.label} className="prototype-alert-timeline-group">
                    <div className="prototype-alert-timeline-label">{group.label}</div>
                    <div className="prototype-alert-list">
                      {group.items.length ? (
                        group.items.map((alert) => {
                          const Icon = alertIcon(alert.category);
                          return (
                            <article key={alert.id} className="prototype-panel prototype-alert-card functional elevated">
                              <div className="prototype-alert-card-top">
                                <div className={`prototype-alert-icon ${alert.severity}`}>
                                  <Icon size={18} />
                                </div>
                                <div className="prototype-alert-copy">
                                  <div className="prototype-alert-copy-head">
                                    <h3>{alert.title}</h3>
                                    <span>{formatTimeLabel(alert.createdAt)}</span>
                                  </div>
                                  <div className="prototype-alert-meta-row">
                                    <span className={`prototype-alert-source-chip ${alert.category}`}>{alert.source}</span>
                                    <span className={`prototype-alert-severity-pill ${alert.severity}`}>{getSeverityLabel(alert.severity)}</span>
                                    <span className={`prototype-alert-ack-pill ${alert.ackStatus}`}>{getAckLabel(alert.ackStatus)}</span>
                                    <span className="prototype-alert-module-chip">{categoryLabel(alert.category)}</span>
                                  </div>
                                  <p>{alert.body}</p>
                                  <div className="prototype-alert-detail-grid">
                                    <div>
                                      <span className="prototype-alert-meta-label">Required action</span>
                                      <strong>{alert.requiredAction}</strong>
                                    </div>
                                    <div>
                                      <span className="prototype-alert-meta-label">Deadline</span>
                                      <strong>{alert.deadline}</strong>
                                    </div>
                                    <div>
                                      <span className="prototype-alert-meta-label">Alert source</span>
                                      <strong>{alert.sourceLabel}</strong>
                                    </div>
                                    <div>
                                      <span className="prototype-alert-meta-label">Delivery status</span>
                                      <strong>{alert.deliveryStatus}</strong>
                                    </div>
                                    <div>
                                      <span className="prototype-alert-meta-label">District</span>
                                      <strong>{alert.district}</strong>
                                    </div>
                                    <div>
                                      <span className="prototype-alert-meta-label">Crop</span>
                                      <strong>{alert.crop}</strong>
                                    </div>
                                  </div>

                                  <div className="prototype-alert-ai-inline">
                                    <span className="prototype-alert-meta-label">AI advisory</span>
                                    <strong>{alert.recommendedAction}</strong>
                                    <small>{alert.explanation}</small>
                                  </div>

                                  <div className="prototype-alert-channel-row">
                                    {alert.channels.map((channel) => (
                                      <span key={`${alert.id}-${channel}`} className="prototype-alert-channel-chip">
                                        {channelLabel(channel)}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="prototype-alert-actions expanded">
                                    <button type="button" className="prototype-alert-action" onClick={() => markAsRead(alert.id)}>
                                      Mark as Read
                                    </button>
                                    <button type="button" className="prototype-alert-action primary" onClick={() => confirmAlert(alert.id)}>
                                      Confirm Alert
                                    </button>
                                    <button type="button" className="prototype-alert-action" onClick={() => archiveAlert(alert.id)}>
                                      Archive
                                    </button>
                                    <button type="button" className="prototype-alert-action" onClick={() => snoozeAlert(alert.id)}>
                                      Snooze
                                    </button>
                                    <button type="button" className="prototype-alert-action" onClick={() => openRelatedModule(alert.relatedModule)}>
                                      Open Related Module
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className="prototype-empty-state-card">
                          <strong>No alerts in {group.label.toLowerCase()} for this filter.</strong>
                          <p>Change the category filter or update the search filters to review other alert activity.</p>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </article>
            )}
          </div>

          <aside className="prototype-alert-side-column">
            <article className="prototype-panel prototype-alert-log enhanced">
              <h3>Alert Analytics Dashboard</h3>

              <div className="prototype-alert-stats-block">
                <strong>Alerts by Category</strong>
                <div className="prototype-alert-mini-list">
                  {categoryStats.map((item) => (
                    <div key={item.label} className="prototype-alert-mini-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="prototype-alert-stats-block">
                <strong>Alerts by Severity</strong>
                <div className="prototype-alert-mini-list">
                  {severityStats.map((item) => (
                    <div key={item.label} className="prototype-alert-mini-row">
                      <span>{item.label}</span>
                      <strong className={item.tone}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="prototype-alert-stats-block">
                <strong>Monthly Trends</strong>
                <div className="prototype-alert-trend-bars">
                  {monthlyTrend.map((item) => (
                    <div key={item.label} className="prototype-alert-trend-column">
                      <div style={{ height: `${Math.max(24, item.value * 18)}px` }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="prototype-alert-stats-block">
                <strong>Analytics Highlights</strong>
                <div className="prototype-alert-mini-list">
                  <div className="prototype-alert-mini-row">
                    <span>Most Frequent Alert Type</span>
                    <strong>{analyticsHighlights.mostFrequentType}</strong>
                  </div>
                  <div className="prototype-alert-mini-row">
                    <span>Most Affected Crop</span>
                    <strong>{analyticsHighlights.mostAffectedCrop}</strong>
                  </div>
                  <div className="prototype-alert-mini-row">
                    <span>Resolution Rate</span>
                    <strong>{analyticsHighlights.resolutionRate}%</strong>
                  </div>
                </div>
              </div>
            </article>

            <article className="prototype-panel prototype-alert-channel-card enhanced">
              <div className="prototype-alert-channel-head">
                <MessageSquareText size={18} />
                <h3>Communication Channel Analytics</h3>
              </div>
              <div className="prototype-alert-channel-grid">
                {channelAnalytics.map((item) => (
                  <div key={item.key}>
                    {item.key === "email" ? <Mail size={18} /> : item.key === "sms" ? <RadioTower size={18} /> : item.key === "push" ? <Siren size={18} /> : <Bell size={18} />}
                    <strong>{item.label}</strong>
                    <span>{item.value} alerts</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel prototype-alert-ack-card">
              <div className="prototype-alert-channel-head">
                <CheckCircle2 size={18} />
                <h3>Notification Delivery Status</h3>
              </div>
              <div className="prototype-alert-mini-list">
                {deliveryAnalytics.map((item) => (
                  <div key={item.label} className="prototype-alert-mini-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel prototype-alert-sms-card">
              <div className="prototype-alert-channel-head">
                <RadioTower size={18} />
                <h3>Offline SMS Notification Mode</h3>
              </div>
              <p className="prototype-alert-help-copy">Supported commands for farmers using low-connectivity or basic phones.</p>
              <div className="prototype-alert-sms-list">
                {smsCommands.map((item) => (
                  <div key={item.command} className="prototype-alert-sms-row">
                    <strong>{item.command}</strong>
                    <span>{item.response}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel prototype-alert-template-card">
              <div className="prototype-alert-channel-head">
                <Settings2 size={18} />
                <h3>Notification Templates Management</h3>
              </div>
              <div className="prototype-alert-template-list">
                {templates.map((item) => (
                  <div key={item.id} className="prototype-alert-template-row">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                      <small>
                        {item.category} • {item.lastUpdated}
                      </small>
                    </div>
                    <button type="button" className="prototype-alert-template-pill" onClick={() => updateTemplateStatus(item.id)}>
                      {item.status}
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel prototype-alert-promo enhanced">
              <div className="prototype-alert-promo-copy">
                <strong>Alert Context</strong>
                <p>
                  {DEMO_MODE
                    ? `Demo alerts are being simulated for ${primaryFarm.name} in ${primaryFarm.district}. All actions and settings are saved locally for final-year project demonstrations.`
                    : "This command center is using live integrated alert streams."}
                </p>
                <button type="button" className="prototype-alert-action" onClick={() => openRelatedModule("/dashboard")}>
                  <ExternalLink size={15} />
                  <span>Open Dashboard</span>
                </button>
              </div>
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}
