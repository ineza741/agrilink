import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,

  CheckCircle2,
  ClipboardList,
  CloudRain,
  Download,
  Droplets,
  FileSpreadsheet,
  FileText,
  Filter,
  FlaskConical,
  History,
  LoaderCircle,
  MapPinned,
  RefreshCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Store,
  Wheat,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import StyledTabButton from "../../components/common/StyledTabButton";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { downloadTextFile } from "../../utils/actions";

const AI_RECOMMENDATION_STORAGE_KEY = "agri-feed-ai-recommendation-center-v1";

const FILTER_TABS = [
  { id: "all", label: "All Recommendations" },
  { id: "critical", label: "Critical / High" },
  { id: "review", label: "Needs Review" },
  { id: "irrigation", label: "Irrigation" },
  { id: "weather", label: "Weather" },
  { id: "pests", label: "Pests & Diseases" },
  { id: "soil", label: "Soil Health" },
  { id: "market", label: "Market Intelligence" },
  { id: "crop", label: "Crop Management" },
];

const CATEGORY_META = {
  weather: { label: "Weather", icon: CloudRain, tone: "blue" },
  pests: { label: "Pest", icon: ShieldAlert, tone: "orange" },
  soil: { label: "Soil", icon: FlaskConical, tone: "green" },
  irrigation: { label: "Irrigation", icon: Droplets, tone: "sky" },
  market: { label: "Market", icon: Store, tone: "amber" },
  crop: { label: "Crop Management", icon: Wheat, tone: "indigo" },
};

const SOIL_PROFILES = {
  Beans: { moisture: 34, ph: 6.4, nitrogen: "Moderate", phosphorus: "Good", potassium: "Low", deficiency: "Potassium deficiency severity is moderate." },
  Almonds: { moisture: 28, ph: 6.9, nitrogen: "Good", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Phosphorus tightening is limiting yield gains." },
  "Hybrid Corn": { moisture: 24, ph: 5.9, nitrogen: "Low", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Nitrogen deficit is the main production constraint." },
  default: { moisture: 29, ph: 6.2, nitrogen: "Moderate", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Balanced inputs are still needed for stronger yield confidence." },
};

const PEST_PROFILES = {
  Beans: { current: "Medium", threat: "Aphid pressure rising in neighboring vegetable blocks." },
  Almonds: { current: "Low", threat: "Low orchard pest pressure with isolated leaf miner reports." },
  "Hybrid Corn": { current: "High", threat: "Fall armyworm risk is elevated in warm cereal zones." },
  default: { current: "Medium", threat: "Mixed disease watch due to changing humidity patterns." },
};

const MARKET_PROFILES = {
  Beans: { currentPrice: 980, trend: "Increasing", demand: "High", opportunity: "School feeding demand is increasing for beans this month." },
  Almonds: { currentPrice: 2400, trend: "Stable", demand: "Moderate", opportunity: "Premium buyers prefer sorted dry kernels for export-grade contracts." },
  "Hybrid Corn": { currentPrice: 680, trend: "Increasing", demand: "High", opportunity: "Feed processors are expanding intake ahead of dry-season stocking." },
  default: { currentPrice: 820, trend: "Stable", demand: "Moderate", opportunity: "Market access remains fair with moderate demand." },
};

const COMMUNITY_PROFILES = {
  "Gatenga Sector, Kicukiro District, Kigali City": "Extension officers in Gatenga are validating moisture-conservation and fertilizer-split practices.",
  "Musanze District": "Musanze agronomists recommend tighter pest scouting around humid blocks this week.",
  "Rwamagana District": "Rwamagana farmer groups are sharing drought-buffer irrigation practices for maize plots.",
  default: "Validated local best practices are available through the community advisory stream.",
};

const REJECTION_OPTIONS = [
  "Not relevant",
  "Too risky",
  "Too expensive",
  "Wrong timing",
  "Other reason",
];

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRwf(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFallbackWeather(region) {
  if (String(region).includes("Gatenga")) {
    return {
      temperature: 24,
      humidity: 76,
      rainProbability: 18,
      rainfall: 1.2,
      wind: 14,
    };
  }
  if (String(region).includes("Musanze")) {
    return {
      temperature: 21,
      humidity: 83,
      rainProbability: 52,
      rainfall: 9.4,
      wind: 11,
    };
  }
  if (String(region).includes("Rwamagana")) {
    return {
      temperature: 27,
      humidity: 61,
      rainProbability: 12,
      rainfall: 0.4,
      wind: 16,
    };
  }

  return {
    temperature: 25,
    humidity: 70,
    rainProbability: 28,
    rainfall: 2.3,
    wind: 13,
  };
}

function getPriorityLevel(score) {
  if (score >= 88) return "Critical";
  if (score >= 76) return "High";
  if (score >= 62) return "Medium";
  return "Low";
}

function getGrowthStage(farm, weather) {
  const crop = farm?.primaryCrop || "";
  if (crop.includes("Corn")) return weather.rainProbability < 20 ? "Flowering" : "Vegetative";
  if (crop.includes("Beans")) return weather.rainfall < 3 ? "Pod Fill" : "Vegetative";
  if (crop.includes("Almond")) return "Nut Development";
  return "Field Monitoring";
}

function buildRecommendationSet({ farm, farmerName, weather, soil, market, pest, community }) {
  const crop = farm?.primaryCrop || "Mixed Crops";
  const stage = getGrowthStage(farm, weather);
  const region = farm?.region || "Rwanda Demo Zone";
  const generatedAt = new Date().toISOString();
  const farmSize = Number(farm?.sizeHectares || 1);
  const rainfallGap = Math.max(0, 22 - weather.rainfall);
  const irrigationDelta = Math.max(8, Math.round(rainfallGap * 1.8 + (weather.temperature - 20)));
  const fertilizerGap = soil.potassium === "Low" ? 18 : soil.nitrogen === "Low" ? 14 : 8;
  const marketLift = market.trend === "Increasing" ? 6 : 2;

  const recommendations = [
    {
      id: `${farm?.id || "farm"}-irrigation`,
      title: `Increase irrigation support for ${crop}`,
      category: "irrigation",
      priority: getPriorityLevel(82 + (weather.rainProbability < 20 ? 8 : 0)),
      confidence: Math.min(96, 78 + irrigationDelta / 2),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      problemDetected: `Moisture gap emerging during ${stage.toLowerCase()}.`,
      description: `Rainfall remains below the comfort threshold and evapotranspiration pressure is increasing on ${farm?.name || "the active field"}.`,
      expectedImpact: [`Protect up to ${Math.round(farmSize * 110)} kg yield equivalent`, "Lower moisture stress", "Improve irrigation efficiency"],
      reasoning: {
        soil: `Soil moisture is ${soil.moisture}% with ${soil.deficiency}`,
        weather: `Temperature is ${weather.temperature}°C, humidity ${weather.humidity}%, rain probability ${weather.rainProbability}%, and rainfall only ${weather.rainfall} mm.`,
        market: `Maintaining crop quality matters because ${crop} is trading at about ${formatRwf(market.currentPrice)} and demand is ${market.demand.toLowerCase()}.`,
        stage: `${crop} is currently in ${stage.toLowerCase()}, when yield response to water stress is high.`,
        confidence: "Confidence combines soil moisture stress, rainfall deficit, crop stage sensitivity, and current market value preservation.",
      },
      scientificReferences: [
        "FAO crop water management guidance",
        "Open-Meteo live weather observations",
        "Local irrigation scheduling heuristics",
      ],
      historicalCases: [
        "Similar irrigation increase reduced flowering stress in Bugesera bean plots last season.",
        "Moisture-timed irrigation improved almond nut retention in monitored orchard blocks.",
      ],
      recommendedAction: `Increase irrigation volume by ${irrigationDelta}% and shift watering to early morning.`,
      expectedOutcome: "Reduced moisture stress and stronger yield stability over the next 7 days.",
      workflowStatus: "Generated",
      comparison: `Historical cases show yield protection when irrigation volume increases before stress becomes visible.`,
    },
    {
      id: `${farm?.id || "farm"}-soil`,
      title: `Correct nutrient balance before yield loss expands`,
      category: "soil",
      priority: getPriorityLevel(74 + fertilizerGap / 2),
      confidence: Math.min(94, 72 + fertilizerGap),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Pending Review",
      problemDetected: `Nutrient imbalance detected for ${crop}.`,
      description: `The nutrient profile suggests ${soil.deficiency.toLowerCase()} which can reduce crop vigor under current field demand.`,
      expectedImpact: ["Improved nutrient uptake", "Better root strength", "Reduced hidden yield loss"],
      reasoning: {
        soil: `pH is ${soil.ph} with nitrogen ${soil.nitrogen}, phosphorus ${soil.phosphorus}, and potassium ${soil.potassium}.`,
        weather: `Moderate humidity and intermittent rainfall mean nutrient timing should be carefully staged to avoid runoff.`,
        market: `A stronger nutrient response supports product quality when market demand is ${market.demand.toLowerCase()}.`,
        stage: `${stage} is a decisive stage for nutrient conversion into yield.`,
        confidence: "Confidence is weighted by deficiency severity, crop nutrient demand, weather suitability for application, and expected profitability gain.",
      },
      scientificReferences: [
        "Soil and crop nutrient interpretation rules",
        "Demo soil analysis thresholds",
        "RAB fertilizer timing guidance",
      ],
      historicalCases: [
        "Potassium correction improved pod fill performance in Gatenga demo plots.",
        "Split nutrient application reduced leaching losses in monitored highland farms.",
      ],
      recommendedAction: `Apply a staged nutrient correction focused on ${soil.potassium === "Low" ? "potassium" : soil.nitrogen === "Low" ? "nitrogen" : "balanced NPK"} within the next 5 days.`,
      expectedOutcome: "Higher nutrient efficiency and improved crop stability before the next production stage.",
      workflowStatus: "Generated",
      comparison: "Historical advisory outcomes show stronger success when nutrient correction is applied before visible stress symptoms appear.",
    },
    {
      id: `${farm?.id || "farm"}-pest`,
      title: `Escalate scouting for ${pest.current.toLowerCase()} pest pressure`,
      category: "pests",
      priority: pest.current === "High" ? "Critical" : pest.current === "Medium" ? "High" : "Medium",
      confidence: pest.current === "High" ? 89 : pest.current === "Medium" ? 82 : 68,
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      problemDetected: `${pest.threat}`,
      description: `Weather-linked pest intelligence indicates that ${crop.toLowerCase()} blocks in ${region} need closer scouting and faster field response.`,
      expectedImpact: ["Lower pest-related yield loss", "Early detection advantage", "Reduced emergency spray cost"],
      reasoning: {
        soil: "Crop vigor and nutrient balance influence plant resilience and post-attack recovery.",
        weather: `Humidity at ${weather.humidity}% and temperature at ${weather.temperature}°C create favorable windows for rapid pest progression.`,
        market: `Protecting crop quality is important because market opportunity remains ${market.trend.toLowerCase()}.`,
        stage: `${stage} increases sensitivity to pest injury on reproductive tissue and canopy health.`,
        confidence: "Confidence blends live weather suitability, crop vulnerability, prior outbreak patterns, and current regional advisory signals.",
      },
      scientificReferences: [
        "Integrated pest management advisory logic",
        "Regional outbreak history",
        "Community validated scouting practices",
      ],
      historicalCases: [
        "Early scouting reduced fall armyworm treatment cost in Rwamagana maize plots.",
        "Aphid control thresholds improved bean quality in Kicukiro demonstration farms.",
      ],
      recommendedAction: "Scout the field within 48 hours, inspect leaf undersides and crop whorls, and prepare targeted intervention if thresholds are reached.",
      expectedOutcome: "Earlier containment and lower economic risk before infestation expands.",
      workflowStatus: "Generated",
      comparison: "Compared with prior cases, immediate scouting gives better control than waiting for visible field-wide symptoms.",
    },
    {
      id: `${farm?.id || "farm"}-market`,
      title: `Align harvest and selling strategy with current market movement`,
      category: "market",
      priority: market.trend === "Increasing" ? "High" : "Medium",
      confidence: market.trend === "Increasing" ? 84 + marketLift : 70,
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      problemDetected: `Market signal indicates ${market.trend.toLowerCase()} pricing momentum for ${crop}.`,
      description: `${market.opportunity} This should influence how you time harvest preparation and post-harvest handling.`,
      expectedImpact: ["Better sales timing", "Higher gross margin", "Reduced distress selling"],
      reasoning: {
        soil: "Field readiness and crop condition determine whether the farm can safely wait for better prices.",
        weather: `Weather risk remains ${weather.rainProbability > 45 ? "elevated" : "manageable"}, affecting harvest timing confidence.`,
        market: `${crop} is currently around ${formatRwf(market.currentPrice)} with ${market.demand.toLowerCase()} demand and a ${market.trend.toLowerCase()} trend.`,
        stage: `${stage} signals how close the crop is to harvest-readiness and market entry.`,
        confidence: "Confidence combines current price, demand, local weather harvesting risk, and readiness of the active crop stage.",
      },
      scientificReferences: [
        "Demo market intelligence feed",
        "Farm readiness and logistics scoring",
        "Historical price response heuristics",
      ],
      historicalCases: [
        "Waiting one week improved bean selling price during prior school-term demand spikes.",
        "Harvest batching improved bargaining power for cooperative orchard sales.",
      ],
      recommendedAction: market.trend === "Increasing" ? "Hold for 7 days while maintaining crop condition and prepare buyers." : "Sell in phased volumes while monitoring the next market refresh.",
      expectedOutcome: "Better selling decision and improved revenue capture from current demand conditions.",
      workflowStatus: "Generated",
      comparison: "Compared with similar historical market windows, phased selling or short waiting periods produced better margins than immediate bulk disposal.",
    },
    {
      id: `${farm?.id || "farm"}-crop`,
      title: `Apply crop-stage management advisory for ${crop}`,
      category: "crop",
      priority: getPriorityLevel(70 + (stage.includes("Flowering") || stage.includes("Pod") ? 10 : 0)),
      confidence: 79,
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      problemDetected: `${crop} is in ${stage.toLowerCase()}, requiring tighter management synchronization.`,
      description: community,
      expectedImpact: ["Stronger field coordination", "Higher practice adoption", "Reduced missed operations"],
      reasoning: {
        soil: "Nutrient and moisture balance set the baseline for whether growth-stage actions will convert into yield gains.",
        weather: `Upcoming weather remains ${weather.rainProbability >= 50 ? "rain-linked" : "manageable for field work"}, influencing task timing.`,
        market: "Current market conditions reward better-quality produce and more predictable harvest timing.",
        stage: `${stage} is a transition window when mistimed decisions create avoidable yield and quality penalties.`,
        confidence: "Confidence combines local extension practice validation, crop stage sensitivity, weather window suitability, and farm history.",
      },
      scientificReferences: [
        "Extension officer practice notes",
        "Community validated best-practice stream",
        "Historical performance trends from analytics",
      ],
      historicalCases: [
        "Farmers following synchronized stage-based actions improved task completion rates.",
        "Community-validated timing reduced rework and input waste in comparable plots.",
      ],
      recommendedAction: "Follow a stage-based task schedule this week and confirm completion against the advisory tracker.",
      expectedOutcome: "Improved coordination between soil, irrigation, pest, and market decisions.",
      workflowStatus: "Generated",
      comparison: "Historical advisory adherence shows better outcomes when actions are grouped by growth-stage windows instead of reacting late.",
    },
  ];

  return recommendations;
}

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(AI_RECOMMENDATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function looksLikeUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value),
  );
}

export function AiRecommendationPage() {
  const { user } = useAuth();
  const { currentProfile, currentFarms } = useFarmerData();
  const farms = currentFarms?.length ? currentFarms : [];
  const [selectedFarmId, setSelectedFarmId] = useState(farms?.[0]?.id || "");
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [regionFilter, setRegionFilter] = useState("All");
  const [cropFilter, setCropFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("7 days");
  const [actionLoading, setActionLoading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [backendLoading, setBackendLoading] = useState(false);
  const [error, setError] = useState("");
  const [weatherState, setWeatherState] = useState({
    source: "Demo Weather Data",
    current: null,
    lastUpdated: "",
  });
  const [selectedRecommendationId, setSelectedRecommendationId] = useState(null);
  const [storedActions, setStoredActions] = useState(() => loadStoredState());
  const [backendRun, setBackendRun] = useState(null);
  const [backendHistory, setBackendHistory] = useState([]);
  const [backendFeedback, setBackendFeedback] = useState([]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms?.[0] || null,
    [farms, selectedFarmId]
  );
  const backendFarmId = selectedFarm?.backendFarmId || (looksLikeUuid(selectedFarm?.id || "") ? selectedFarm.id : "");
  const backendMode = isBackendSessionActive() && Boolean(backendFarmId);

  useEffect(() => {
    if (!farms?.length) return;

    if (isBackendSessionActive()) {
      const backendFarm = farms.find((f) => f.backendFarmId || looksLikeUuid(f.id));
      if (backendFarm && backendFarm.id !== selectedFarmId) {
        setSelectedFarmId(backendFarm.id);
        return;
      }
    }

    if (!selectedFarmId) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  useEffect(() => {
    let active = true;
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      if (active) {
        timedOut = true;
        setLoadingTimedOut(true);
        setLoading(false);
        setWeatherState({
          source: "Demo/local data is being used because live data is unavailable.",
          current: getFallbackWeather(selectedFarm?.region || farms?.[0]?.region || "Gatenga Sector, Kicukiro District, Kigali City"),
          lastUpdated: new Date().toISOString(),
        });
      }
    }, 5000);

    async function loadWeather() {
      if (!selectedFarm) {
        if (active) {
          clearTimeout(timeoutId);
          setWeatherState({
            source: "Demo Weather Data",
            current: getFallbackWeather(farms?.[0]?.region || "Gatenga Sector, Kicukiro District, Kigali City"),
            lastUpdated: new Date().toISOString(),
          });
          setLoading(false);
          setError("");
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const fallback = getFallbackWeather(selectedFarm.region);
        if (selectedFarm.location?.lat && selectedFarm.location?.lng) {
          const forecast = await apiClient.weather.forecast(
            selectedFarm.location.lat,
            selectedFarm.location.lng,
            { timeoutMs: 5000 },
          );

          if (!active) return;
          if (timedOut) return;

          clearTimeout(timeoutId);
          setWeatherState({
            source: "Live Weather Data",
            current: {
              temperature: Math.round(forecast?.current?.temperature_2m ?? fallback.temperature),
              humidity: Math.round(forecast?.current?.relative_humidity_2m ?? fallback.humidity),
              rainProbability: Math.round(
                forecast?.daily?.precipitation_probability_max?.[0] ?? fallback.rainProbability,
              ),
              rainfall: Number((forecast?.daily?.rain_sum?.[0] ?? fallback.rainfall).toFixed(1)),
              wind: Math.round(forecast?.current?.wind_speed_10m ?? fallback.wind),
            },
            lastUpdated: new Date().toISOString(),
          });
        } else {
          if (active && !timedOut) {
            clearTimeout(timeoutId);
            setWeatherState({
              source: "Demo Weather Data",
              current: fallback,
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      } catch {
        if (!active || timedOut) return;
        clearTimeout(timeoutId);
        setWeatherState({
          source: "Demo Weather Data",
          current: getFallbackWeather(selectedFarm.region),
          lastUpdated: new Date().toISOString(),
        });
      } finally {
        if (active && !timedOut) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [selectedFarm]);

  useEffect(() => {
    localStorage.setItem(AI_RECOMMENDATION_STORAGE_KEY, JSON.stringify(storedActions));
  }, [storedActions]);

  const fallbackWeather = useMemo(
    () => getFallbackWeather(selectedFarm?.region || farms?.[0]?.region || "Gatenga Sector, Kicukiro District, Kigali City"),
    [selectedFarm],
  );

  const activeWeather = backendRun?.signals?.weather || weatherState.current || fallbackWeather;
  const activeSoil =
    backendRun?.signals?.soil ||
    SOIL_PROFILES[selectedFarm?.primaryCrop] ||
    SOIL_PROFILES.default;
  const activePest =
    backendRun?.signals?.pest ||
    PEST_PROFILES[selectedFarm?.primaryCrop] ||
    PEST_PROFILES.default;
  const activeMarket =
    backendRun?.signals?.market ||
    MARKET_PROFILES[selectedFarm?.primaryCrop] ||
    MARKET_PROFILES.default;
  const activeCommunityInsight =
    backendRun?.signals?.community ||
    COMMUNITY_PROFILES[selectedFarm?.region] ||
    COMMUNITY_PROFILES.default;

  const activeWeatherRef = useRef(activeWeather);
  activeWeatherRef.current = activeWeather;
  const weatherSourceRef = useRef(weatherState.source);
  weatherSourceRef.current = weatherState.source;

  const fetchBackendData = useCallback(async () => {
    if (!backendMode || !backendFarmId) {
      return { latest: null, history: [], feedback: [] };
    }

    const [latest, history, feedback] = await Promise.all([
      phase1BackendService.recommendations.latest(backendFarmId).catch(() => null),
      phase1BackendService.recommendations.history(backendFarmId).catch(() => []),
      phase1BackendService.recommendations.latest(backendFarmId)
        .then((r) => r?.id ? phase1BackendService.recommendations.listFeedback(r.id) : [])
        .catch(() => []),
    ]);

    return { latest, history, feedback };
  }, [backendFarmId, backendMode]);

  const refreshBackendRecommendations = useCallback(
    async ({ generateIfMissing = false, successNotice = "" } = {}) => {
      if (!backendMode || !backendFarmId) {
        setBackendRun(null);
        setBackendHistory([]);
        setBackendFeedback([]);
        setBackendLoading(false);
        setLoadingTimedOut(false);
        return null;
      }

      setBackendLoading(true);
      setLoadingTimedOut(false);

      let timeoutId;
      const backendFetchPromise = async () => {
        let latest = await phase1BackendService.recommendations.latest(backendFarmId);

        if (!latest && generateIfMissing) {
          latest = await phase1BackendService.recommendations.generate(backendFarmId, {
            weatherSourceLabel: weatherSourceRef.current,
            weather: {
              ...activeWeatherRef.current,
              source: weatherSourceRef.current,
            },
          });
        }

        const history = await phase1BackendService.recommendations.history(backendFarmId);
        const feedback = latest?.id
          ? await phase1BackendService.recommendations.listFeedback(latest.id)
          : [];

        return { latest, history, feedback };
      };

      const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Backend recommendation fetch timed out."));
        }, 5000);
      });

      try {
        const result = await Promise.race([
          backendFetchPromise(),
          timeoutPromise,
        ]);
        clearTimeout(timeoutId);

        const { latest, history, feedback } = result;

        setBackendRun(latest);
        setBackendHistory(history);
        setBackendFeedback(feedback);

        if (successNotice) {
          toast.success(successNotice);
        }

        setBackendLoading(false);
        setLoadingTimedOut(false);
        return latest;
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("Failed to refresh backend recommendations:", error);

        if (error.message === "Backend recommendation fetch timed out.") {
          setLoadingTimedOut(true);
          toast.warning("Live recommendation data timed out. Using demo data.");
        } else {
          toast.warning("Backend recommendation data is not available yet. Using demo data.");
        }

        setBackendRun(null);
        setBackendHistory([]);
        setBackendFeedback([]);
        setBackendLoading(false);
        return null;
      }
    },
    [backendFarmId, backendMode],
  );

  useEffect(() => {
    if (!backendMode) {
      setBackendRun(null);
      setBackendHistory([]);
      setBackendFeedback([]);
      return;
    }

    refreshBackendRecommendations({ generateIfMissing: true });
  }, [backendMode, backendFarmId, refreshBackendRecommendations]);

  const farmerName = currentProfile?.fullName || (["admin", "extensionofficer"].includes(user?.role) ? "Rodrigue Farmer" : user?.name) || "Rodrigue Farmer";
  const regionOptions = useMemo(
    () => ["All", ...new Set(farms.map((farm) => farm.region).filter(Boolean))],
    [farms],
  );
  const cropOptions = useMemo(
    () => ["All", ...new Set(farms.map((farm) => farm.primaryCrop).filter(Boolean))],
    [farms],
  );

  const weather = activeWeather;
  const soil = activeSoil;
  const pest = activePest;
  const market = activeMarket;
  const communityInsight = activeCommunityInsight;

  const recommendations = useMemo(() => {
    if (!selectedFarm) return [];

    let baseRecommendations;
    if (backendRun?.recommendations?.length) {
      baseRecommendations = backendRun.recommendations;
    } else if (backendMode && backendRun === null) {
      return [];
    } else {
      baseRecommendations = buildRecommendationSet({
        farm: selectedFarm,
        farmerName,
        weather,
        soil,
        market,
        pest,
        community: communityInsight,
      });
    }

    return baseRecommendations.map((item) => {
      const stored = storedActions[item.id];
      return {
        ...item,
        workflowStatus: stored?.workflowStatus || item.workflowStatus,
        status: stored?.status || item.status,
        actionLog: stored?.actionLog || item.actionLog || [],
      };
    });
  }, [backendRun, backendMode, communityInsight, farmerName, market, pest, selectedFarm, soil, storedActions, weather]);

  useEffect(() => {
    if (!selectedRecommendationId && recommendations?.[0]?.id) {
      setSelectedRecommendationId(recommendations[0].id);
    }
  }, [recommendations, selectedRecommendationId]);

  const selectedRecommendation =
    recommendations.find((item) => item.id === selectedRecommendationId) || recommendations?.[0] || null;

  const normalizeCategory = (cat) => {
    const c = String(cat || "").toLowerCase().trim();
    if (["pest", "pests", "pests & diseases"].includes(c)) return "pests";
    return c;
  };

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((item) => {
      const recCategory = normalizeCategory(item.category);

      const matchesTab =
        activeTab === "all" ? true :
        activeTab === "critical" ? (item.priority === "Critical" || item.priority === "High") :
        activeTab === "review" ? (item.status === "Pending Review" || item.workflowStatus === "Rejected" || item.workflowStatus === "Pending Review") :
        recCategory === activeTab;

      const matchesRegion = regionFilter === "All" || item.region === regionFilter;
      const matchesCrop = cropFilter === "All" || item.crop === cropFilter;

      const normalizedStatus = String(item.status || "").toLowerCase().trim();
      const normalizedWorkflow = String(item.workflowStatus || "").toLowerCase().trim();
      const filterStatus = String(statusFilter).toLowerCase().trim();
      const matchesStatus =
        statusFilter === "All" ||
        normalizedStatus === filterStatus ||
        normalizedWorkflow === filterStatus ||
        (filterStatus === "pending review" && (normalizedStatus === "pending review" || normalizedWorkflow === "rejected"));

      const ageDays = Math.max(
        0,
        Math.round((Date.now() - new Date(item.generatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      );
      const matchesDate =
        dateRangeFilter === "All" ||
        (dateRangeFilter === "7 days" && ageDays <= 7) ||
        (dateRangeFilter === "30 days" && ageDays <= 30) ||
        (dateRangeFilter === "90 days" && ageDays <= 90);

      return matchesTab && matchesRegion && matchesCrop && matchesStatus && matchesDate;
    });
  }, [activeTab, cropFilter, dateRangeFilter, recommendations, regionFilter, statusFilter, clearFiltersKey]);

  const hasActiveFilters = activeTab !== "all" || regionFilter !== "All" || cropFilter !== "All" || statusFilter !== "All" || dateRangeFilter !== "7 days";

  const clearFilters = () => {
    setActiveTab("all");
    setRegionFilter("All");
    setCropFilter("All");
    setStatusFilter("All");
    setDateRangeFilter("7 days");
    setClearFiltersKey((k) => k + 1);
  };

  const summaryCards = useMemo(() => {
    const total = recommendations.length;
    const critical = recommendations.filter((item) => item.priority === "Critical").length;
    const applied = recommendations.filter((item) => item.workflowStatus === "Applied" || item.workflowStatus === "Completed").length;
    const pending = recommendations.filter((item) => item.status === "Pending Review" || item.workflowStatus === "Generated").length;
    const avgConfidence = total
      ? Math.round(recommendations.reduce((sum, item) => sum + item.confidence, 0) / total)
      : 0;
    const regions = new Set(recommendations.map((item) => item.region)).size;

    return [
      { label: "Total Recommendations", value: total, tone: "blue", icon: ClipboardList },
      { label: "Critical Recommendations", value: critical, tone: "red", icon: AlertTriangle },
      { label: "Recommendations Applied", value: applied, tone: "green", icon: CheckCircle2 },
      { label: "Pending Review", value: pending, tone: "amber", icon: History },
      { label: "Average Confidence Score", value: `${avgConfidence}%`, tone: "sky", icon: BrainCircuit },
      { label: "Regions Monitored", value: regions, tone: "indigo", icon: MapPinned },
    ];
  }, [recommendations]);

  const priorityRecommendation = useMemo(() => {
    const safeRecs = Array.isArray(recommendations) ? recommendations : [];
    return [...safeRecs].sort((a, b) => {
      const priorityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const aScore = priorityRank[a.priority] * 100 + a.confidence;
      const bScore = priorityRank[b.priority] * 100 + b.confidence;
      return bScore - aScore;
    })?.[0] || null;
  }, [recommendations]);

  const analytics = useMemo(() => {
    if (backendRun?.analytics) {
      return backendRun.analytics;
    }

    const categoryCounts = Object.keys(CATEGORY_META).map((key) => ({
      key,
      label: CATEGORY_META[key].label,
      count: recommendations.filter((item) => item.category === key).length,
    }));
    const accepted = recommendations.filter((item) => item.workflowStatus === "Approved" || item.workflowStatus === "Applied" || item.workflowStatus === "Completed").length;
    const rejected = recommendations.filter((item) => item.workflowStatus === "Rejected").length;
    const viewed = recommendations.filter((item) => item.workflowStatus === "Viewed").length;
    const avgConfidence = recommendations.length
      ? Math.round(recommendations.reduce((sum, item) => sum + item.confidence, 0) / recommendations.length)
      : 0;

    return {
      categoryCounts,
      accepted,
      rejected,
      viewed,
      avgConfidence,
      farmerAdoptionRate: recommendations.length ? Math.round((accepted / recommendations.length) * 100) : 0,
      yieldImpact: recommendations.length ? `${Math.round(recommendations.length * 4.2)}% protected potential` : "0%",
    };
  }, [backendRun, recommendations]);

  const updateRecommendationWorkflow = async (recommendation, nextStatus, extra = {}) => {
    const actionKey = `${recommendation.id}-${nextStatus}`;
    setActionLoading(actionKey);

    try {
      if (backendMode && backendRun?.id) {
        await phase1BackendService.recommendations.addFeedback(backendRun.id, {
          recommendationId: recommendation.id,
          actionType: recommendation.category || "AI Recommendation",
          feedbackStatus: nextStatus,
          rejectionReason: extra.reason || extra.rejectionReason || null,
          note: extra.note || null,
        });

        setStoredActions((current) => {
          const previous = current[recommendation.id] || { actionLog: [] };
          return {
            ...current,
            [recommendation.id]: {
              ...previous,
              status: nextStatus === "Rejected" ? "Pending Review" : previous.status || recommendation.status,
              workflowStatus: nextStatus,
              actionLog: [
                {
                  status: nextStatus,
                  timestamp: new Date().toISOString(),
                  ...extra,
                },
                ...(previous.actionLog || []),
              ].slice(0, 10),
            },
          };
        });

        await refreshBackendRecommendations({});

        const toastMessages = {
          Approved: { title: "Recommendation approved", desc: `The ${recommendation.category} recommendation for ${recommendation.crop} has been approved.` },
          Rejected: { title: "Recommendation rejected", desc: "The recommendation was rejected successfully." },
          Sent: { title: "Recommendation sent", desc: "The recommendation was sent to the farmer." },
          Viewed: { title: "Historical comparison ready", desc: "Historical farm records have been loaded for comparison." },
        };
        const msg = toastMessages[nextStatus] || { title: "Action completed", desc: "The recommendation status has been updated." };
        toast.success(msg.title, { description: msg.desc });
        return;
      }

      setStoredActions((current) => {
        const previous = current[recommendation.id] || { actionLog: [] };
        return {
          ...current,
          [recommendation.id]: {
            ...previous,
            status: nextStatus === "Rejected" ? "Pending Review" : previous.status || recommendation.status,
            workflowStatus: nextStatus,
            actionLog: [
              {
                status: nextStatus,
                timestamp: new Date().toISOString(),
                ...extra,
              },
              ...(previous.actionLog || []),
            ].slice(0, 10),
          },
        };
      });

      const localMessages = {
        Approved: { title: "Recommendation approved", desc: `The ${recommendation.category} recommendation has been approved.` },
        Rejected: { title: "Recommendation rejected", desc: "The recommendation was rejected successfully." },
        Sent: { title: "Recommendation sent", desc: "The recommendation was sent to the farmer." },
        Viewed: { title: "Historical comparison ready", desc: "Historical farm records have been loaded for comparison." },
      };
      const localMsg = localMessages[nextStatus] || { title: "Action completed", desc: "The recommendation status has been updated." };
      toast.success(localMsg.title, { description: localMsg.desc });
    } catch (err) {
      toast.error("Action failed", {
        description: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const exportPdf = () => {
    if (backendMode && backendFarmId) {
      const token = localStorage.getItem("agri-feed-access-token");
      const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api"}/recommendations/farms/${backendFarmId}/export/pdf`;

      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Export failed");
          return res.blob();
        })
        .then((blob) => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "recommendation-report.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          toast.success("PDF exported", { description: "Report downloaded successfully." });
        })
        .catch(() => toast.error("Export failed", { description: "Unable to download PDF. Please try again." }));
    } else {
      toast.warning("Backend required", { description: "Connect to backend to export PDF reports." });
    }
  };

  const exportExcel = () => {
    if (backendMode && backendFarmId) {
      const token = localStorage.getItem("agri-feed-access-token");
      const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api"}/recommendations/farms/${backendFarmId}/export/excel`;

      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Export failed");
          return res.blob();
        })
        .then((blob) => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "recommendation-report.xlsx";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          toast.success("Excel exported", { description: "Report downloaded successfully." });
        })
        .catch(() => toast.error("Export failed", { description: "Unable to download Excel. Please try again." }));
    } else {
      toast.warning("Backend required", { description: "Connect to backend to export Excel reports." });
    }
  };

  const historySummary = useMemo(() => {
    if (backendFeedback.length) {
      return backendFeedback
        .map((entry) => ({
          id: entry.id,
          recommendationId: entry.recommendationId,
          status: entry.feedbackStatus,
          timestamp: entry.timestamp || entry.createdAt,
          reason: entry.rejectionReason || entry.note || "",
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
    }

    return Object.entries(storedActions)
      .flatMap(([id, value]) =>
        (value.actionLog || []).map((entry) => ({
          id: `${id}-${entry.timestamp}`,
          recommendationId: id,
          ...entry,
        })),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [backendFeedback, storedActions]);

  return (
    <section className="management-page ai-recommendation-center">
      <div className="ai-center-hero">
        <div className="ai-center-title-block">
          <span className="ai-center-label">AI Recommendation Center</span>
          <h1>AI Recommendation Center</h1>
          <p>
            AI-powered agricultural decision support combining weather, soil, crop health, pest intelligence,
            irrigation data, market trends, and farmer activity.
          </p>
          <div className="ai-center-source-row">
            <span className="prototype-source-pill blue">{backendRun?.weatherSourceLabel || weatherState.source}</span>
            <span className="prototype-source-pill green">{backendRun?.soilSourceLabel || "Local Farm Data"}</span>
            <span className="prototype-source-pill amber">
              {backendMode ? "Backend Recommendation Engine" : "Demo Recommendation Engine"}
            </span>
          </div>
        </div>

        <div className="ai-center-actions-card prototype-panel">
          <div className="ai-center-actions-grid">
            <button
              type="button"
              className="recommendation-primary-button"
              data-testid="generate-btn"
              data-backend-mode={backendMode ? "true" : "false"}
              data-backend-loading={backendLoading ? "true" : "false"}
              data-backend-farm-id={backendFarmId || "none"}
              disabled={backendLoading}
              onClick={async () => {
                if (backendMode && backendFarmId) {
                  setBackendLoading(true);
                  setError("");
                  const minDelay = new Promise((resolve) => setTimeout(resolve, 800));
                  try {
                    const [generated] = await Promise.all([
                      phase1BackendService.recommendations.generate(backendFarmId, {
                        weatherSourceLabel: weatherState.source,
                        weather: {
                          ...weather,
                          source: weatherState.source,
                        },
                      }),
                      minDelay,
                    ]);

                    if (generated) {
                      const { latest, history, feedback } = await fetchBackendData();
                      setBackendRun(latest);
                      setBackendHistory(history);
                      setBackendFeedback(feedback);
                      toast.success("Recommendation generated", {
                        description: "New AI recommendations have been created for this farm.",
                      });
                    } else {
                      toast.info("No new recommendation", {
                        description: "The latest farm conditions have not changed.",
                      });
                    }
                  } catch (err) {
                    toast.error("Generation failed", {
                      description: "Unable to generate recommendations. Please try again.",
                    });
                  } finally {
                    setBackendLoading(false);
                  }
                  return;
                }

                toast.info("Demo mode", {
                  description: "Connect to backend to generate real recommendations.",
                });
              }}
            >
              <Sparkles size={16} />
              <span>{backendLoading ? "Generating..." : "Generate New Recommendation"}</span>
            </button>
            <button
              type="button"
              className="recommendation-secondary-button"
              onClick={async () => {
                if (backendMode) {
                  await refreshBackendRecommendations({
                    generateIfMissing: true,
                    successNotice: "Recommendation analysis refreshed from the backend engine.",
                  });
                  return;
                }

                setSelectedFarmId(selectedFarm?.id || farms?.[0]?.id || "");
              }}
            >
              <RefreshCcw size={16} />
              <span>Refresh Analysis</span>
            </button>
            <button type="button" className="recommendation-secondary-button" onClick={exportPdf}>
              <FileText size={16} />
              <span>Export PDF</span>
            </button>
            <button type="button" className="recommendation-secondary-button" onClick={exportExcel}>
              <FileSpreadsheet size={16} />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              className="recommendation-secondary-button"
              onClick={() =>
                toast.info("Recommendation history", {
                  description: backendMode
                    ? `Loaded ${backendHistory.length} recommendation run${backendHistory.length === 1 ? "" : "s"} for this farm.`
                    : "Viewing local demo records.",
                })
              }
            >
              <History size={16} />
              <span>Recommendation History</span>
            </button>
          </div>
        </div>
      </div>

      <div className="management-toolbar ai-center-toolbar">
        <label className="recommendation-farm-selector ai-center-farm-selector">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="management-summary-grid ai-center-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="mini-summary-card ai-center-summary-card">
              <div className={`stat-icon tone-${card.tone}`}>
                <Icon size={16} />
              </div>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <article className="prototype-panel ai-center-filter-panel">
        <div className="ai-center-filter-head">
          <h2>
            <Filter size={18} />
            <span>Recommendation Filters</span>
          </h2>
          <small>Filter across category, status, farm, region, and advisory window.</small>
        </div>

        <div className="recommendation-tabs ai-center-tabs">
          {FILTER_TABS.map((tab) => (
            <StyledTabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </StyledTabButton>
          ))}
        </div>

        <div className="ai-center-filter-grid">
          <label>
            <span>Region</span>
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
              {regionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Farmer</span>
            <input type="text" value={farmerName} readOnly />
          </label>
          <label>
            <span>Crop Type</span>
            <select value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}>
              {cropOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Recommendation Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {["All", "Generated", "Pending Review", "Approved", "Sent", "Viewed", "Applied", "Completed", "Rejected"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Date Range</span>
            <select value={dateRangeFilter} onChange={(event) => setDateRangeFilter(event.target.value)}>
              {["7 days", "30 days", "90 days", "All"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {hasActiveFilters ? (
            <button type="button" className="recommendation-secondary-button clear-filters-btn" onClick={clearFilters}>
              <XCircle size={15} />
              <span>Clear Filters</span>
            </button>
          ) : null}
        </div>
      </article>

      {loading || backendLoading ? (
        <div className="recommendation-state-card">
          <LoaderCircle size={18} className="spin" />
          <span>
            {loadingTimedOut 
              ? "Demo/local data is being used because live data is unavailable." 
              : "Loading AI recommendation engine..."}
          </span>
        </div>
      ) : error ? (
        <div className="recommendation-state-card error">
          <div>
            <strong>Unable to load recommendation engine.</strong>
            <p>{error}</p>
          </div>
          <div className="recommendation-modal-actions">
            <button type="button" className="recommendation-secondary-button" onClick={() => setSelectedFarmId(selectedFarm?.id || farms?.[0]?.id || "")}>
              Retry
            </button>
            <button type="button" className="recommendation-primary-button" onClick={() => window.location.reload()}>
              Reload Analysis
            </button>
          </div>
        </div>
      ) : !recommendations.length ? (
        <div className="recommendation-state-card">
          <div>
            <strong>No recommendations available yet.</strong>
            <p>Generate recommendations using current weather, soil, pest, and market intelligence.</p>
          </div>
          <button type="button" className="recommendation-primary-button" onClick={() => toast.info("Ready to generate", { description: "Select a farm and click Generate New Recommendation." })}>
            Generate Recommendations
          </button>
        </div>
      ) : !filteredRecommendations.length ? (
        <div className="recommendation-state-card">
          <div>
            <strong>No recommendations match the selected filters.</strong>
            <p>Try adjusting your filter criteria or clear all filters to see all recommendations.</p>
          </div>
          <button type="button" className="recommendation-secondary-button" onClick={clearFilters}>
            <XCircle size={15} />
            <span>Clear Filters</span>
          </button>
        </div>
      ) : (
        <>
          <div className="ai-center-main-grid">
            <div className="ai-center-list-column">
              <article className="prototype-panel">
                <div className="panel-toolbar ai-center-panel-toolbar">
                  <div>
                    <h2>AI Recommendation List</h2>
                    <p>{filteredRecommendations.length} advisory items are currently visible for review.</p>
                  </div>
                  <span className="prototype-source-pill blue">
                    {selectedFarm?.region || "No region selected"}
                  </span>
                </div>

                <div className="recommendation-card-list">
                  {filteredRecommendations.map((item) => {
                    const categoryMeta = CATEGORY_META[item.category];
                    const Icon = categoryMeta.icon;
                    const isSelected = selectedRecommendationId === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`prototype-panel recommendation-card functional ai-center-recommendation-card${isSelected ? " selected" : ""}`}
                      >
                        <div className="recommendation-card-head">
                          <div className="recommendation-head-main">
                            <div className={`recommendation-icon tone-${categoryMeta.tone}`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <h2>{item.title}</h2>
                              <p>{item.description}</p>
                            </div>
                          </div>
                          <div className="recommendation-confidence">
                            <span>AI confidence</span>
                            <strong>{item.confidence}%</strong>
                          </div>
                        </div>

                        <div className="recommendation-badge-row ai-center-badges">
                          <span className="recommendation-category-badge">{categoryMeta.label}</span>
                          <span className={`recommendation-priority-label ${item.priority.toLowerCase()}`}>{item.priority}</span>
                          <span className={`recommendation-status-chip ${item.workflowStatus === "Approved" ? "approved" : item.workflowStatus === "Rejected" ? "rejected" : item.workflowStatus === "Sent" ? "sent" : "pending"}`}>{item.workflowStatus || item.status}</span>
                          <span className="recommendation-driver-chip">{item.region}</span>
                          <span className="recommendation-driver-chip">{item.crop}</span>
                          <span className="recommendation-driver-chip">{formatShortDate(item.generatedAt)}</span>
                        </div>

                        <div className="ai-center-card-metadata">
                          <span><b>Farmer:</b> {item.farmer}</span>
                          <span><b>Expected impact:</b> {item.expectedImpact.join(" · ")}</span>
                        </div>

                        <div className="recommendation-card-footer">
                          <div className="recommendation-reviewer">
                            <i className={item.workflowStatus === "Approved" ? "" : "muted"} />
                            <span>{item.workflowStatus}</span>
                          </div>

                          <div className="recommendation-actions">
                            {item.workflowStatus !== "Approved" && item.workflowStatus !== "Rejected" && item.workflowStatus !== "Sent" && (
                              <>
                                <button
                                  type="button"
                                  className="recommendation-primary-button"
                                  disabled={actionLoading === `${item.id}-Approved`}
                                  onClick={() => updateRecommendationWorkflow(item, "Approved")}
                                >
                                  {actionLoading === `${item.id}-Approved` ? (
                                    <><LoaderCircle size={14} className="spin" /> Approving...</>
                                  ) : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  className="recommendation-muted-button recommendation-danger-button"
                                  disabled={actionLoading === `${item.id}-Rejected`}
                                  onClick={() => updateRecommendationWorkflow(item, "Rejected", { reason: REJECTION_OPTIONS[0] })}
                                >
                                  {actionLoading === `${item.id}-Rejected` ? (
                                    <><LoaderCircle size={14} className="spin" /> Rejecting...</>
                                  ) : "Reject"}
                                </button>
                                <button
                                  type="button"
                                  className="recommendation-secondary-button recommendation-send-button"
                                  disabled={actionLoading === `${item.id}-Sent`}
                                  onClick={() => updateRecommendationWorkflow(item, "Sent")}
                                >
                                  {actionLoading === `${item.id}-Sent` ? (
                                    <><LoaderCircle size={14} className="spin" /> Sending...</>
                                  ) : <><Send size={15} /><span>Send to Farmer</span></>}
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="recommendation-secondary-button"
                              onClick={() => {
                                toast.info("Historical comparison ready", {
                                  description: "Historical farm records have been loaded for comparison.",
                                });
                              }}
                            >
                              Compare With Historical Data
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            </div>

            <aside className="ai-center-side-column">
              <article className="prototype-panel recommendation-priority-card">
                <div className="recommendation-scheduler-head">
                  <ShieldAlert size={18} />
                  <h2>Priority Action Center</h2>
                </div>

                {priorityRecommendation ? (
                  <div className="ai-center-priority-body">
                    <span className={`recommendation-priority-label ${priorityRecommendation.priority.toLowerCase()}`}>
                      {priorityRecommendation.priority} Priority
                    </span>
                    <strong>{priorityRecommendation.title}</strong>
                    <p>{priorityRecommendation.problemDetected}</p>
                    <ul className="recommendation-priority-list">
                      <li><span>Problem Detected</span><strong>{priorityRecommendation.problemDetected}</strong></li>
                      <li><span>Affected Region</span><strong>{priorityRecommendation.region}</strong></li>
                      <li><span>Affected Crop</span><strong>{priorityRecommendation.crop}</strong></li>
                      <li><span>Recommended Action</span><strong>{priorityRecommendation.recommendedAction}</strong></li>
                      <li><span>Urgency</span><strong>{priorityRecommendation.priority}</strong></li>
                      <li><span>AI Confidence</span><strong>{priorityRecommendation.confidence}%</strong></li>
                      <li><span>Expected Outcome</span><strong>{priorityRecommendation.expectedOutcome}</strong></li>
                    </ul>
                    <div className="recommendation-actions">
                      <button
                        type="button"
                        className="recommendation-primary-button"
                        disabled={actionLoading === `${priorityRecommendation.id}-Approved`}
                        onClick={() => updateRecommendationWorkflow(priorityRecommendation, "Approved")}
                      >
                        {actionLoading === `${priorityRecommendation.id}-Approved` ? (
                          <><LoaderCircle size={14} className="spin" /> Approving...</>
                        ) : "Approve Immediately"}
                      </button>
                      <button
                        type="button"
                        className="recommendation-secondary-button"
                        disabled={actionLoading === `${priorityRecommendation.id}-Sent`}
                        onClick={() => updateRecommendationWorkflow(priorityRecommendation, "Sent")}
                      >
                        {actionLoading === `${priorityRecommendation.id}-Sent` ? (
                          <><LoaderCircle size={14} className="spin" /> Sending...</>
                        ) : "Notify Farmer"}
                      </button>
                      <button
                        type="button"
                        className="recommendation-secondary-button"
                        disabled={actionLoading === `${priorityRecommendation.id}-Viewed`}
                        onClick={() => updateRecommendationWorkflow(priorityRecommendation, "Viewed")}
                      >
                        {actionLoading === `${priorityRecommendation.id}-Viewed` ? (
                          <><LoaderCircle size={14} className="spin" /> Loading...</>
                        ) : "Schedule Follow-up"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>

              <article className="prototype-panel recommendation-impact-card">
                <div className="recommendation-impact-icon">
                  <BrainCircuit size={18} />
                </div>
                <div className="recommendation-impact-copy">
                  <strong>AI Decision Explanation</strong>
                  <p>
                    Soil moisture below threshold, rainfall probability under {weather.rainProbability}%,
                    crop in {getGrowthStage(selectedFarm, weather).toLowerCase()}, and heat pressure at {weather.temperature}°C
                    are increasing irrigation and nutrient urgency.
                  </p>
                </div>
              </article>

              <article className="prototype-panel ai-center-tracking-card">
                <div className="recommendation-scheduler-head">
                  <ClipboardList size={18} />
                  <h2>Farmer Action Tracking</h2>
                </div>
                <div className="ai-center-history-list">
                  {historySummary.length ? historySummary.map((entry) => (
                    <div key={entry.id} className="ai-center-history-item">
                      <strong>{entry.status}</strong>
                      <span>{formatDateTime(entry.timestamp)}</span>
                      {entry.reason ? <small>{entry.reason}</small> : null}
                    </div>
                  )) : (
                    <div className="prototype-empty-state-card functional">
                      <strong>No action history yet.</strong>
                      <p>Approve, reject, or send recommendations to build the farmer action workflow log.</p>
                    </div>
                  )}
                </div>
              </article>
            </aside>
          </div>

          {selectedRecommendation ? (
            <article className="prototype-panel recommendation-advisory-panel ai-center-details-panel">
              <div className="recommendation-advisory-head">
                <div>
                  <h2>Recommendation Details Panel</h2>
                  <p>{selectedRecommendation.title}</p>
                </div>
                <button
                  type="button"
                  className="recommendation-secondary-button"
                  onClick={() => downloadTextFile(
                    `${selectedRecommendation.id}-details.txt`,
                    `${selectedRecommendation.title}\n\nProblem Summary:\n${selectedRecommendation.problemDetected}\n\nAI Analysis:\n${selectedRecommendation.description}\n\nRecommended Action:\n${selectedRecommendation.recommendedAction}\n\nExpected Result:\n${selectedRecommendation.expectedOutcome}`
                  )}
                >
                  <Download size={15} />
                  <span>Export Details</span>
                </button>
              </div>

              <div className="recommendation-explanation-stack">
                <div className="recommendation-explanation-item">
                  <strong>Problem Summary</strong>
                  <p>{selectedRecommendation.problemDetected}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>AI Analysis</strong>
                  <p>{selectedRecommendation.description}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Environmental Factors</strong>
                  <p>Weather, soil nutrient balance, market timing, and community best-practice validation were combined.</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Weather Conditions</strong>
                  <p>{selectedRecommendation.reasoning.weather}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Soil Conditions</strong>
                  <p>{selectedRecommendation.reasoning.soil}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Pest Risk</strong>
                  <p>{pest.threat}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Market Conditions</strong>
                  <p>{selectedRecommendation.reasoning.market}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Recommended Actions</strong>
                  <p>{selectedRecommendation.recommendedAction}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Expected Results</strong>
                  <p>{selectedRecommendation.expectedOutcome}</p>
                </div>
                <div className="recommendation-explanation-item">
                  <strong>Confidence Explanation</strong>
                  <p>{selectedRecommendation.reasoning.confidence}</p>
                </div>
              </div>

              <div className="recommendation-guidance-box">
                <div className="recommendation-guidance-head">
                  <Sparkles size={18} />
                  <strong>Scientific References &amp; Historical Similar Cases</strong>
                </div>
                <ol>
                  {(selectedRecommendation.scientificReferences || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {(selectedRecommendation.historicalCases || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            </article>
          ) : null}

          <div className="recommendation-scheduler-grid ai-center-bottom-grid">
            <article className="prototype-panel recommendation-priority-card">
              <div className="recommendation-scheduler-head">
                <BarChart3 size={18} />
                <h2>Recommendation Analytics</h2>
              </div>
              <div className="ai-center-analytics-list">
                {analytics.categoryCounts.map((item) => (
                  <div key={item.key} className="ai-center-analytics-row">
                    <div className="ai-center-analytics-head">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="irrigation-resource-track">
                      <div
                        className="irrigation-resource-fill"
                        style={{ width: `${recommendations.length ? (item.count / recommendations.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="ai-center-analytics-metrics">
                  <div><span>Acceptance Rate</span><strong>{analytics.farmerAdoptionRate}%</strong></div>
                  <div><span>Farmer Adoption Rate</span><strong>{analytics.farmerAdoptionRate}%</strong></div>
                  <div><span>Yield Impact Analysis</span><strong>{analytics.yieldImpact}</strong></div>
                  <div><span>Confidence Distribution</span><strong>{analytics.avgConfidence}% avg</strong></div>
                </div>
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
