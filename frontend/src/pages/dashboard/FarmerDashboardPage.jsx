import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  BrainCircuit,
  CloudSun,
  Download,
  Droplets,
  FlaskConical,
  Fuel,
  Gauge,
  MapPin,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { downloadJsonFile } from "../../utils/actions";

const MARKET_STORAGE_KEY = "agri-feed-market-module-v1";
const PEST_STORAGE_KEY = "agri-feed-pest-module-v1";
const FEEDBACK_STORAGE_KEY = "agri-feed-recommendation-feedback-v2";
const IRRIGATION_STORAGE_KEY = "agri-feed-irrigation-module-v1";
const NOTIFICATION_STORAGE_KEY = "agri-feed-notification-module-v1";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values?.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function loadStoredState(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function formatRwf(value) {
  return `RWF ${Math.round(Number(value) || 0).toLocaleString()}`;
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dateValue));
}

function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function inferGrowthStage(farm) {
  const cropName = (farm.primaryCrop || "").toLowerCase();
  if (cropName.includes("corn") || cropName.includes("maize")) return "Vegetative";
  if (cropName.includes("bean")) return "Flowering";
  if (cropName.includes("almond")) return "Fruit Set";
  if (cropName.includes("rice")) return "Tillering";
  if (cropName.includes("potato")) return "Bulking";
  return "Establishment";
}

function getWeatherDescription(code) {
  const mapping = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    80: "Slight showers",
    81: "Moderate showers",
    82: "Violent showers",
    95: "Thunderstorm",
  };
  return mapping[code] || "Stable";
}

function buildSoilSignals(farm) {
  const land = (farm.landType || "").toLowerCase();
  const crop = (farm.primaryCrop || "").toLowerCase();
  const ph = land.includes("clay") ? 5.8 : land.includes("loam") ? 6.4 : 6.1;
  const nitrogen = land.includes("sandy") ? 41 : crop.includes("bean") ? 55 : 48;
  const potassium = crop.includes("almond") ? 24 : crop.includes("bean") ? 22 : 28;
  const phosphorus = crop.includes("corn") || crop.includes("maize") ? 26 : 31;
  const organicMatter = land.includes("clay") ? 3.1 : 2.5;
  const score = clamp(
    Math.round(
      100 -
        Math.abs(6.5 - ph) * 12 -
        Math.max(0, 55 - nitrogen) * 0.55 -
        Math.max(0, 30 - phosphorus) * 0.45 -
        Math.max(0, 32 - potassium) * 0.7
    ),
    42,
    96
  );

  return {
    score,
    ph,
    nitrogen,
    phosphorus,
    potassium,
    organicMatter,
    phStatus: ph >= 6 && ph <= 7 ? "Balanced" : ph < 6 ? "Acidic" : "Alkaline",
    nutrientStatus:
      nitrogen >= 50 && potassium >= 30
        ? "Healthy"
        : nitrogen >= 42 && potassium >= 24
          ? "Watch"
          : "Needs input",
    nitrogenStatus: nitrogen >= 50 ? "Healthy" : nitrogen >= 42 ? "Moderate" : "Low",
    potassiumStatus: potassium >= 30 ? "Healthy" : potassium >= 24 ? "Moderate" : "Low",
  };
}

function buildMarketSignals(farm) {
  const crop = (farm.primaryCrop || "").toLowerCase();
  const base = crop.includes("bean")
    ? { price: 980, demand: 82, trend: "Strong upward", opportunity: "Beans demand is rising in nearby markets." }
    : crop.includes("corn") || crop.includes("maize")
      ? { price: 680, demand: 78, trend: "Stable", opportunity: "Maize remains liquid with moderate buyer competition." }
      : crop.includes("almond")
        ? { price: 2200, demand: 74, trend: "Premium", opportunity: "Premium crop, but timing is important for margin." }
        : { price: 860, demand: 70, trend: "Steady", opportunity: "Steady demand with no major downside signal." };

  return {
    topCropPrice: formatRwf(base.price),
    bestSellingCrop: farm.primaryCrop || "Mixed crops",
    marketTrend: base.trend,
    marketDemand: base.demand,
    opportunity: base.opportunity,
  };
}

function buildPestSignals(farm, pestState) {
  const latestEvent = pestState.historyLog?.[0];
  const crop = (farm.primaryCrop || "").toLowerCase();
  const baseRisk = crop.includes("bean") ? 62 : crop.includes("corn") || crop.includes("maize") ? 58 : 49;
  const pestRisk = clamp(
    baseRisk +
      (latestEvent?.severity === "Extreme" ? 14 : latestEvent?.severity === "Moderate" ? 6 : 0),
    28,
    92
  );

  return {
    pestRisk,
    latestEvent,
    status: pestRisk >= 78 ? "High" : pestRisk >= 56 ? "Medium" : "Low",
  };
}

function buildWeatherAlerts(weather) {
  const daily = weather?.daily || {};
  const totalRain = (daily.rain_sum || []).reduce((sum, value) => sum + Number(value || 0), 0);
  const maxTemp = Math.max(...(daily.temperature_2m_max || [0]).map((value) => Number(value || 0)));
  const maxWind = Math.max(...(daily.wind_speed_10m_max || [0]).map((value) => Number(value || 0)));
  const heavyRainDays = (daily.rain_sum || []).filter((value) => Number(value || 0) >= 30).length;

  const alerts = [];
  if (heavyRainDays > 0) {
    alerts.push({
      type: "Weather",
      title: "Heavy rain alert",
      severity: "Critical",
      message: "Heavy rainfall may affect field access and drainage.",
    });
  }
  if (maxTemp >= 32) {
    alerts.push({
      type: "Weather",
      title: "Heatwave alert",
      severity: "High",
      message: "High temperature may increase water stress during this growth stage.",
    });
  }
  if (totalRain < 10) {
    alerts.push({
      type: "Weather",
      title: "Drought risk",
      severity: "High",
      message: "7-day rain total is below planting comfort range.",
    });
  }
  if (maxWind >= 35) {
    alerts.push({
      type: "Weather",
      title: "Strong wind alert",
      severity: "Medium",
      message: "Peak wind may affect spraying and irrigation efficiency.",
    });
  }
  return alerts;
}

function buildResourceRows(irrigationState, farm) {
  const waterUsage = clamp(Math.round((Number(irrigationState?.soilMoisture || 28) / 90) * 100), 18, 92);
  const fertilizerUsage = clamp(Math.round((Number(irrigationState?.targetYield || 12) / 18) * 100), 18, 90);
  const fuelConsumption = clamp(Math.round((Number(irrigationState?.budget || 2200) / 3500) * 100), 16, 88);
  const irrigationEfficiency = clamp(
    Math.round(
      72 +
        (farm.irrigationType?.toLowerCase().includes("drip")
          ? 16
          : farm.irrigationType?.toLowerCase().includes("iot")
            ? 12
            : 6) -
        (100 - waterUsage) * 0.12
    ),
    42,
    96
  );

  return [
    { label: "Water Usage", value: waterUsage, tone: "blue" },
    { label: "Fertilizer Usage", value: fertilizerUsage, tone: "green" },
    { label: "Fuel Consumption", value: fuelConsumption, tone: "amber" },
    { label: "Irrigation Efficiency", value: irrigationEfficiency, tone: "sky" },
  ];
}

function buildTasks({ farm, soilSignals, weatherForecast, pestSignals, recommendationState }) {
  const rain7d = (weatherForecast?.daily?.rain_sum || []).reduce((sum, value) => sum + Number(value || 0), 0);
  const now = new Date();
  return [
    {
      task: soilSignals.nitrogenStatus === "Low" ? "Apply nitrogen fertilizer" : "Review nutrient balance",
      dueDate: formatShortDate(now),
      priority: soilSignals.nitrogenStatus === "Low" ? "Critical" : "Medium",
    },
    {
      task: "Inspect pest trap",
      dueDate: formatShortDate(new Date(now.getTime() + 86400000 * 2)),
      priority: pestSignals.pestRisk >= 70 ? "High" : "Medium",
    },
    {
      task: rain7d < 10 ? "Start irrigation" : "Review irrigation timing",
      dueDate: formatShortDate(new Date(now.getTime() + 86400000 * 3)),
      priority: rain7d < 10 ? "High" : "Low",
    },
    {
      task:
        recommendationState?.topAction?.type === "harvest"
          ? "Prepare harvest field"
          : `Monitor ${farm.primaryCrop || "current crop"} progress`,
      dueDate: formatShortDate(new Date(now.getTime() + 86400000 * 5)),
      priority: recommendationState?.topAction?.priority || "Medium",
    },
  ];
}

function buildSummaryCards({ farms, farm, weather, soilSignals, alerts, recommendationState, marketSignals }) {
  const farmSize = farms.reduce((sum, item) => sum + Number(item.sizeHectares || 0), 0);
  const activeFields = farms.length;
  const mainCrops = [...new Set(farms.map((item) => item.primaryCrop).filter(Boolean))].slice(0, 2);
  const currentRain = Number(weather?.current?.rain || weather?.current?.precipitation || 0);
  const weatherRisk =
    alerts.some((item) => item.type === "Weather" && item.severity === "Critical")
      ? "Critical"
      : alerts.some((item) => item.type === "Weather")
        ? "Watch"
        : "Stable";
  const warningCount = alerts.filter((item) => item.severity !== "Critical").length;
  const criticalCount = alerts.filter((item) => item.severity === "Critical").length;

  return [
    {
      key: "farm",
      title: "Farm Overview",
      icon: Sprout,
      tone: "green",
      hero: `${farmSize.toFixed(1)} ha`,
      meta: `${activeFields} active fields`,
      details: [`${mainCrops.join(", ") || "No crop set"}`, `${farm.verificationStatus || "Pending"} status`],
    },
    {
      key: "weather",
      title: "Weather Status",
      icon: CloudSun,
      tone: "blue",
      hero: weather ? `${Math.round(weather.current.temperature_2m)}°C` : "--",
      meta: weather ? `${weather.current.relative_humidity_2m}% humidity` : "Humidity --",
      details: [weather ? `${currentRain.toFixed(1)} mm rain` : "Rain --", `${weatherRisk} weather risk`],
    },
    {
      key: "soil",
      title: "Soil Health",
      icon: FlaskConical,
      tone: "amber",
      hero: `${soilSignals.score}%`,
      meta: `${soilSignals.phStatus} pH`,
      details: [`Nitrogen ${soilSignals.nitrogenStatus}`, `Nutrients ${soilSignals.nutrientStatus}`],
    },
    {
      key: "alerts",
      title: "Active Alerts",
      icon: AlertTriangle,
      tone: "red",
      hero: `${criticalCount} critical`,
      meta: `${warningCount} warning alerts`,
      details: [alerts[0]?.title || "No urgent alerts", alerts[1]?.title || "System stable"],
    },
    {
      key: "ai",
      title: "AI Recommendation",
      icon: BrainCircuit,
      tone: "sky",
      hero: recommendationState?.topAction?.meta.actionLabel || "--",
      meta: recommendationState?.topAction ? `${recommendationState.topAction.confidence}% confidence` : "Confidence --",
      details: [recommendationState?.topAction?.priority || "Priority --", recommendationState?.topAction?.meta.category || "Category --"],
    },
    {
      key: "market",
      title: "Market Snapshot",
      icon: TrendingUp,
      tone: "violet",
      hero: marketSignals.topCropPrice,
      meta: marketSignals.bestSellingCrop,
      details: [marketSignals.marketTrend, `${marketSignals.marketDemand}% demand score`],
    },
  ];
}

function normalizeSeverity(severity) {
  if (severity === "Critical") return "critical";
  if (severity === "High") return "high";
  if (severity === "Medium") return "medium";
  return "low";
}

function buildActivityFeed({ alerts, recentActivity }) {
  const alertItems = alerts.map((alert, index) => ({
    id: `alert-${index}-${alert.title}`,
    tone: normalizeSeverity(alert.severity),
    symbol: alert.severity === "Critical" ? "🔴" : alert.severity === "High" ? "🟠" : "🟡",
    title: alert.title,
    detail: alert.message,
    timestamp: "Live",
    order: 5 - index,
  }));

  const recentItems = recentActivity.map((item, index) => ({
    id: `activity-${index}-${item.title}`,
    tone: "info",
    symbol:
      item.title.includes("Soil") ? "🟢" :
      item.title.includes("Market") ? "🟢" :
      item.title.includes("Pest") ? "🟡" :
      item.title.includes("Weather") ? "🟠" : "🟢",
    title: item.title,
    detail: item.detail,
    timestamp: item.timestamp,
    order: 20 - index,
  }));

  return [...alertItems, ...recentItems]
    .sort((a, b) => b.order - a.order)
    .slice(0, 6);
}

function buildRecentActivity({ pestState, feedbackState, marketState, notificationState, farm }) {
  const recommendationRecord = Object.values(feedbackState?.[farm.id]?.decisions || {}).at(-1);
  const marketAlert = marketState?.alerts?.[0];
  const recentNotifications = notificationState?.messages?.slice(0, 2) || [];
  const pestEvent = pestState?.historyLog?.[0];

  return [
    {
      title: "Soil Test Submitted",
      detail: `Soil profile reviewed for ${farm.name}.`,
      timestamp: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
    },
    ...(recentNotifications[0]
      ? [{
          title: "Weather Alert Triggered",
          detail: recentNotifications[0].title || "Weather advisory updated.",
          timestamp: recentNotifications[0].timeAgo || "Recently",
        }]
      : []),
    ...(recommendationRecord
      ? [{
          title: `Recommendation ${recommendationRecord.feedbackStatus === "accepted" ? "Accepted" : "Rejected"}`,
          detail: `${recommendationRecord.actionType} recommendation updated by farmer feedback.`,
          timestamp: formatLongDate(recommendationRecord.timestamp),
        }]
      : []),
    ...(marketAlert
      ? [{
          title: "Market Price Updated",
          detail: `${marketAlert.crop} target updated to ${marketAlert.targetPrice}.`,
          timestamp: marketAlert.createdAt ? formatShortDate(marketAlert.createdAt) : "Today",
        }]
      : []),
    ...(pestEvent
      ? [{
          title: "Pest Report Added",
          detail: `${pestEvent.pathogen} recorded with ${pestEvent.severity.toLowerCase()} severity.`,
          timestamp: pestEvent.date,
        }]
      : []),
  ].slice(0, 5);
}

export function FarmerDashboardPage() {
  const navigate = useNavigate();
  const { currentFarms, currentProfile, getProfileCompleteness } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [];
  const [selectedFarmId, setSelectedFarmId] = useState(currentFarms[0]?.id || "");
  const [dashboardState, setDashboardState] = useState({
    loading: true,
    error: "",
    weather: null,
    summaryCards: [],
    activityFeed: [],
    tasks: [],
    resourceRows: [],
    recommendationState: null,
    soilSignals: null,
    marketSignals: null,
    fieldHealth: "Unknown",
  });

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0] || null,
    [farms, selectedFarmId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!selectedFarm) {
        setDashboardState((current) => ({
          ...current,
          loading: false,
          error: "",
          summaryCards: [],
          activityFeed: [],
          tasks: [],
          resourceRows: [],
        }));
        return;
      }

      setDashboardState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const weather = await apiClient.weather.forecast(selectedFarm.location.lat, selectedFarm.location.lng);
        const soilSignals = buildSoilSignals(selectedFarm);
        const pestState = loadStoredState(PEST_STORAGE_KEY);
        const feedbackState = loadStoredState(FEEDBACK_STORAGE_KEY);
        const marketState = loadStoredState(MARKET_STORAGE_KEY);
        const irrigationState = loadStoredState(IRRIGATION_STORAGE_KEY);
        const notificationState = loadStoredState(NOTIFICATION_STORAGE_KEY);
        const marketSignals = buildMarketSignals(selectedFarm);
        const weatherAlerts = buildWeatherAlerts(weather);
        const pestSignals = buildPestSignals(selectedFarm, pestState);

        const soilAlerts = [];
        if (soilSignals.nitrogenStatus === "Low") {
          soilAlerts.push({
            type: "Soil",
            title: "Nitrogen deficiency risk",
            severity: "High",
            message: "Nitrogen is below the target band for this field.",
          });
        }
        if (soilSignals.potassiumStatus === "Low") {
          soilAlerts.push({
            type: "Soil",
            title: "Potassium deficiency risk",
            severity: "Medium",
            message: "Potassium is limiting crop resilience and grain quality.",
          });
        }
        const pestAlerts =
          pestSignals.pestRisk >= 72
            ? [{
                type: "Pest",
                title: "Pest pressure elevated",
                severity: pestSignals.pestRisk >= 82 ? "Critical" : "High",
                message: `Regional pest pressure for ${selectedFarm.primaryCrop || "this crop"} is elevated.`,
              }]
            : [];
        const allAlerts = [...weatherAlerts, ...soilAlerts, ...pestAlerts];

        const recommendationTopRecord = Object.values(feedbackState?.[selectedFarm.id]?.decisions || {}).at(-1);
        const totalRain = (weather.daily?.rain_sum || []).reduce((sum, value) => sum + Number(value || 0), 0);
        const topActionType =
          soilSignals.nitrogenStatus === "Low"
            ? "Fertilize"
            : totalRain < 10
              ? "Irrigate"
              : marketSignals.marketDemand > 80
                ? "Market"
                : "Plant";

        const recommendationState = {
          topAction: {
            type: topActionType.toLowerCase(),
            meta: {
              actionLabel: topActionType === "Market" ? "Sell strategically" : topActionType === "Plant" ? "Plant field" : topActionType === "Irrigate" ? "Start irrigation" : "Apply fertilizer",
              category:
                topActionType === "Market"
                  ? "Market"
                  : topActionType === "Irrigate"
                    ? "Irrigation"
                    : topActionType === "Fertilize"
                      ? "Fertilizer"
                      : "Planting",
            },
            confidence: clamp(
              Math.round(
                soilSignals.score * 0.35 +
                  marketSignals.marketDemand * 0.22 +
                  (100 - average(weather.daily?.precipitation_probability_max || [40])) * 0.18 +
                  (recommendationTopRecord?.feedbackStatus === "accepted" ? 8 : 0)
              ),
              58,
              97
            ),
            priority:
              soilSignals.nitrogenStatus === "Low" || allAlerts.some((item) => item.severity === "Critical")
                ? "Critical"
                : totalRain < 12 || pestSignals.pestRisk > 70
                  ? "High"
                  : "Medium",
            reason:
              topActionType === "Fertilize"
                ? "Nitrogen is below the target band for the current crop stage."
                : topActionType === "Irrigate"
                  ? "Rainfall deficit detected during an active growth window."
                  : topActionType === "Market"
                    ? "Market demand and price signals favor action this week."
                    : "Soil, weather, and market signals support field preparation.",
            weatherRisk:
              weatherAlerts.some((item) => item.severity === "Critical")
                ? "High"
                : weatherAlerts.length
                  ? "Medium"
                  : "Low",
            soilRisk:
              soilSignals.nitrogenStatus === "Low" || soilSignals.potassiumStatus === "Low"
                ? "Medium"
                : "Low",
            marketOpportunity:
              marketSignals.marketDemand >= 80 ? "High" : marketSignals.marketDemand >= 70 ? "Medium" : "Low",
          },
        };

        const summaryCards = buildSummaryCards({
          farms,
          farm: selectedFarm,
          weather,
          soilSignals,
          alerts: allAlerts,
          recommendationState,
          marketSignals,
        });

        const tasks = buildTasks({
          farm: selectedFarm,
          soilSignals,
          weatherForecast: weather,
          pestSignals,
          recommendationState,
        });

        const recentActivity = buildRecentActivity({
          pestState,
          feedbackState,
          marketState,
          notificationState,
          farm: selectedFarm,
        });
        const activityFeed = buildActivityFeed({
          alerts: allAlerts,
          recentActivity,
        });
        const resourceRows = buildResourceRows(irrigationState, selectedFarm);
        const fieldHealth =
          soilSignals.score >= 75 && pestSignals.pestRisk < 60
            ? "Healthy"
            : soilSignals.score >= 58 && pestSignals.pestRisk < 75
              ? "Watch"
              : "Needs attention";

        if (!cancelled) {
          setDashboardState({
            loading: false,
            error: "",
            weather,
            soilSignals,
            marketSignals,
            summaryCards,
            activityFeed,
            tasks,
            resourceRows,
            recommendationState,
            fieldHealth,
          });
        }
      } catch {
        if (!cancelled) {
          setDashboardState({
            loading: false,
            error: "Unable to load dashboard intelligence. Please check internet connection or farm coordinates.",
            weather: null,
            soilSignals: null,
            marketSignals: null,
            summaryCards: [],
            activityFeed: [],
            tasks: [],
            resourceRows: [],
            recommendationState: null,
            fieldHealth: "Unknown",
          });
        }
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [farms, selectedFarm, currentProfile?.email]);

  const mapEmbedUrl = selectedFarm
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(selectedFarm.location.lng - 0.02).toFixed(4)}%2C${(selectedFarm.location.lat - 0.02).toFixed(4)}%2C${(selectedFarm.location.lng + 0.02).toFixed(4)}%2C${(selectedFarm.location.lat + 0.02).toFixed(4)}&layer=mapnik&marker=${selectedFarm.location.lat.toFixed(4)}%2C${selectedFarm.location.lng.toFixed(4)}`
    : "";

  const quickActions = [
    { label: "Add Soil Test", icon: FlaskConical, action: () => navigate("/soil-crop") },
    { label: "Analyze Weather", icon: CloudSun, action: () => navigate("/weather") },
    { label: "Check Pests", icon: AlertTriangle, action: () => navigate("/pests-diseases") },
    { label: "View Market", icon: TrendingUp, action: () => navigate("/market-intelligence") },
    { label: "Generate Advisory", icon: BrainCircuit, action: () => navigate("/recommendations") },
    {
      label: "Download Report",
      icon: Download,
      action: () =>
        downloadJsonFile("farmer-dashboard-report.json", {
          generatedAt: new Date().toISOString(),
          farm: selectedFarm,
          summaryCards: dashboardState.summaryCards,
          tasks: dashboardState.tasks,
          activityFeed: dashboardState.activityFeed,
        }),
    },
  ];

  if (!farms.length) {
    return (
      <section className="farmer-dashboard-page smart-dashboard">
        <div className="recommendation-state-card">
          No farm records available yet. Add a farm to unlock dashboard intelligence.
        </div>
      </section>
    );
  }

  return (
    <section className="farmer-dashboard-page smart-dashboard command-dashboard">
      <div className="page-title-block farmer-page-title command-dashboard-hero">
        <div>
          <h1>Smart Agriculture Command Center</h1>
          <p>
            A fast decision-support overview for farm health, urgent risks, and the next best action.
          </p>
        </div>
        <div className="dashboard-status-pill">
          <ShieldCheck size={16} />
          <span>Profile completeness {getProfileCompleteness(currentProfile?.userId || "")}%</span>
        </div>
      </div>

      <div className="dashboard-control-strip">
        <label className="dashboard-farm-selector">
          <span>Active Farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>
      </div>

      {dashboardState.loading ? (
        <div className="prototype-weather-status">Loading integrated farm intelligence...</div>
      ) : null}
      {dashboardState.error ? (
        <div className="prototype-weather-status error">{dashboardState.error}</div>
      ) : null}

      {!dashboardState.loading && !dashboardState.error ? (
        <>
          <div className="command-summary-grid">
            {dashboardState.summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.key} className={`prototype-panel command-summary-card tone-${card.tone}`}>
                  <div className="command-summary-head">
                    <div className={`farmer-summary-icon tone-${card.tone}`}>
                      <Icon size={18} />
                    </div>
                    <h2>{card.title}</h2>
                  </div>
                  <strong>{card.hero}</strong>
                  <span>{card.meta}</span>
                  <div className="command-summary-details">
                    {card.details.map((item) => (
                      <small key={item}>{item}</small>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="command-center-grid">
            <article className="prototype-panel command-decision-center">
              <div className="dashboard-section-head">
                <h2>AI Decision Center</h2>
                <span>Top next action</span>
              </div>
              {dashboardState.recommendationState?.topAction ? (
                <div className="command-decision-body">
                  <div className="command-decision-badge-row">
                    <span className={`dashboard-priority-chip ${dashboardState.recommendationState.topAction.priority.toLowerCase()}`}>
                      {dashboardState.recommendationState.topAction.priority}
                    </span>
                    <span className="recommendation-category-badge">
                      {dashboardState.recommendationState.topAction.meta.category}
                    </span>
                  </div>
                  <h3>{dashboardState.recommendationState.topAction.meta.actionLabel}</h3>
                  <p>{dashboardState.recommendationState.topAction.reason}</p>
                  <div className="command-decision-metrics">
                    <div>
                      <span>Confidence</span>
                      <strong>{dashboardState.recommendationState.topAction.confidence}%</strong>
                    </div>
                    <div>
                      <span>Weather Risk</span>
                      <strong>{dashboardState.recommendationState.topAction.weatherRisk}</strong>
                    </div>
                    <div>
                      <span>Soil Risk</span>
                      <strong>{dashboardState.recommendationState.topAction.soilRisk}</strong>
                    </div>
                    <div>
                      <span>Market Opportunity</span>
                      <strong>{dashboardState.recommendationState.topAction.marketOpportunity}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dashboard-primary-link command-decision-button"
                    onClick={() => navigate("/recommendations")}
                  >
                    View Full Recommendation
                  </button>
                </div>
              ) : (
                <div className="dashboard-empty-note">No recommendation available for this farm yet.</div>
              )}
            </article>

            <article className="prototype-panel command-map-panel">
              <div className="dashboard-section-head">
                <h2>Farm Location &amp; Field Overview</h2>
                <span>{selectedFarm.plotLabel || "Main field"}</span>
              </div>
              <div className="command-map-shell">
                <div className="field-map-live command-map-frame">
                  <iframe title="Farm map overview" src={mapEmbedUrl} loading="lazy" />
                </div>
                <div className="command-map-meta">
                  <div><strong>Farm Name</strong><span>{selectedFarm.name}</span></div>
                  <div><strong>Current Crop</strong><span>{selectedFarm.primaryCrop || "Not assigned"}</span></div>
                  <div><strong>Growth Stage</strong><span>{inferGrowthStage(selectedFarm)}</span></div>
                  <div><strong>Field Health</strong><span>{dashboardState.fieldHealth}</span></div>
                </div>
                <div className="field-overview-actions command-map-actions">
                  <button
                    type="button"
                    className="dashboard-ghost-button"
                    onClick={() => navigate("/profile")}
                  >
                    View on Map
                  </button>
                  <a
                    className="dashboard-primary-link"
                    href={`https://www.google.com/maps?q=${selectedFarm.location.lat},${selectedFarm.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Google Maps
                  </a>
                </div>
              </div>
            </article>
          </div>

          <div className="command-resource-strip">
            {dashboardState.resourceRows.map((row) => (
              <article key={row.label} className="prototype-panel command-resource-card">
                <div className="resource-item-top">
                  <span>{row.label}</span>
                  <strong>{row.value}%</strong>
                </div>
                <div className="resource-bar-track compact">
                  <div className={`resource-bar-fill tone-${row.tone}`} style={{ width: `${row.value}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="command-lower-grid">
            <article className="prototype-panel command-activity-panel">
              <div className="dashboard-section-head">
                <h2>Farm Activity Feed</h2>
                <span>Most recent events first</span>
              </div>
              <div className="command-feed-list">
                {dashboardState.activityFeed.length ? (
                  dashboardState.activityFeed.map((item) => (
                    <div key={item.id} className={`command-feed-item tone-${item.tone}`}>
                      <span className="command-feed-symbol">{item.symbol}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <time>{item.timestamp}</time>
                    </div>
                  ))
                ) : (
                  <div className="dashboard-empty-note">No recent activity recorded yet.</div>
                )}
              </div>
            </article>

            <article className="prototype-panel command-timeline-panel">
              <div className="dashboard-section-head">
                <h2>Upcoming Tasks Timeline</h2>
                <span>{dashboardState.tasks.length} planned</span>
              </div>
              <div className="command-timeline-list">
                {dashboardState.tasks.map((task) => (
                  <div key={`${task.task}-${task.dueDate}`} className="command-timeline-item">
                    <div className="command-timeline-date">
                      <span>{task.dueDate}</span>
                    </div>
                    <div className="command-timeline-copy">
                      <strong>{task.task}</strong>
                      <small>{task.priority} priority</small>
                    </div>
                    <span className={`dashboard-priority-chip ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="quick-actions-panel command-center-actions">
            <h2>Quick Actions</h2>
            <div className="quick-action-row extended">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} type="button" className="quick-action-chip" onClick={action.action}>
                    <Icon size={15} />
                    <span>{action.label}</span>
                    <ArrowRight size={14} />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
