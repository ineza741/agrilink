import {
  AlertTriangle, ArrowUpRight, BadgeCheck, Bug, CheckCircle2, ChevronRight, Clock,
  CloudDrizzle, CloudLightning, Download, Droplets, Eye, FileClock, ImageUp, Info,
  MapPinned, Navigation, RefreshCw, Search, ShieldAlert, ShieldCheck, Sparkles, Sprout,
  Target, Thermometer, ThermometerSun, Trash2, TrendingDown, TrendingUp, Upload, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { SectionCard } from "../../components/common/SectionCard";
import { MetricCard } from "../../components/common/MetricCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { ImageCard } from "../../components/common/ImageCard";
import ImageWithFallback from "../../components/common/ImageWithFallback";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { downloadJsonFile, downloadTextFile } from "../../utils/actions";

const PEST_STORAGE_KEY = "agri-feed-pest-module-v2";

const cropOptions = ["Potato", "Maize", "Beans", "Tomato", "Vegetables", "Cereals"];
const symptomOptions = ["Yellow Spots", "Brown Holes", "White Mold", "Wilting"];

const cropEconomics = {
  Potato: { pricePerKg: 520, yieldPerHa: 18 },
  Maize: { pricePerKg: 680, yieldPerHa: 5.5 },
  Beans: { pricePerKg: 980, yieldPerHa: 1.9 },
  Tomato: { pricePerKg: 850, yieldPerHa: 12 },
  Vegetables: { pricePerKg: 740, yieldPerHa: 10 },
  Cereals: { pricePerKg: 610, yieldPerHa: 4.8 },
};

const diseaseLibrary = [
  {
    id: "late-blight",
    name: "Late Blight",
    scientificName: "Phytophthora infestans",
    affectedCrops: ["Potato", "Tomato"],
    commonSymptoms: ["Yellow Spots", "White Mold"],
    preventionAdvice: "Use resistant varieties, improve field drainage, and avoid prolonged canopy wetness.",
    treatment: {
      chemical: "Apply copper-based fungicide or cymoxanil mix at 5-7 day intervals under disease pressure.",
      organic: "Use Trichoderma and remove infected foliage to reduce spore spread.",
    },
    ipmAdvice: "Combine weekly scouting, drainage control, and sanitation of infected residues.",
    weatherProfile: {
      humidityMin: 75,
      humidityMax: 95,
      temperatureMin: 16,
      temperatureMax: 24,
      rainfallMin: 10,
    },
    symptomWeights: {
      "Yellow Spots": 22,
      "White Mold": 26,
      "Brown Holes": 6,
      Wilting: 10,
    },
    imageUrl:
      "https://images.unsplash.com/photo-1649088311431-9ffe92a4d4a4?w=800&q=80",
  },
  {
    id: "green-peach-aphid",
    name: "Green Peach Aphid",
    scientificName: "Myzus persicae",
    affectedCrops: ["Vegetables", "Beans", "Potato", "Tomato"],
    commonSymptoms: ["Wilting", "Yellow Spots"],
    preventionAdvice: "Control alternate host weeds, scout leaf undersides, and protect beneficial insects.",
    treatment: {
      chemical: "Apply selective systemic insecticide at economic threshold to reduce vector spread.",
      organic: "Use neem extract plus predator release and sticky-trap monitoring.",
    },
    ipmAdvice: "Start with field scouting and biological control before broad chemical intervention.",
    weatherProfile: {
      humidityMin: 65,
      humidityMax: 88,
      temperatureMin: 20,
      temperatureMax: 28,
      rainfallMin: 2,
    },
    symptomWeights: {
      "Yellow Spots": 20,
      "White Mold": 4,
      "Brown Holes": 5,
      Wilting: 24,
    },
    imageUrl:
      "https://images.unsplash.com/photo-1522325636832-5dbc1440f793?w=800&q=80",
  },
  {
    id: "powdery-mildew",
    name: "Powdery Mildew",
    scientificName: "Erysiphales spp.",
    affectedCrops: ["Beans", "Vegetables"],
    commonSymptoms: ["White Mold", "Yellow Spots"],
    preventionAdvice: "Reduce excessive nitrogen, space crops for airflow, and irrigate early in the day.",
    treatment: {
      chemical: "Use sulfur-based fungicide when disease is first observed under suitable weather.",
      organic: "Use bicarbonate foliar spray with resistant variety rotation.",
    },
    ipmAdvice: "Prioritize spacing, canopy ventilation, and balanced nitrogen management.",
    weatherProfile: {
      humidityMin: 60,
      humidityMax: 82,
      temperatureMin: 18,
      temperatureMax: 27,
      rainfallMin: 0,
    },
    symptomWeights: {
      "Yellow Spots": 14,
      "White Mold": 28,
      "Brown Holes": 4,
      Wilting: 8,
    },
    imageUrl:
      "https://images.unsplash.com/photo-1602332659518-1e068472e7ab?w=800&q=80",
  },
  {
    id: "fall-armyworm",
    name: "Fall Armyworm",
    scientificName: "Spodoptera frugiperda",
    affectedCrops: ["Maize", "Cereals"],
    commonSymptoms: ["Brown Holes", "Wilting"],
    preventionAdvice: "Scout maize whorls twice weekly and destroy egg masses before larval establishment.",
    treatment: {
      chemical: "Target larvae early with selective caterpillar insecticide in the whorl stage.",
      organic: "Use ash/neem mix in the whorl and conserve parasitoids where possible.",
    },
    ipmAdvice: "Use pheromone traps, early scouting, and targeted control before heavy foliar damage.",
    weatherProfile: {
      humidityMin: 55,
      humidityMax: 85,
      temperatureMin: 22,
      temperatureMax: 31,
      rainfallMin: 5,
    },
    symptomWeights: {
      "Yellow Spots": 6,
      "White Mold": 3,
      "Brown Holes": 28,
      Wilting: 18,
    },
    imageUrl:
      "https://images.unsplash.com/photo-1634049785220-33c3d8d2d336?w=800&q=80",
  },
];

const outbreakHistorySeed = [
  {
    id: "seed-1",
    date: "2026-05-22T09:10:00.000Z",
    monthLabel: "May 2026",
    pathogen: "Phytophthora infestans",
    severity: "Moderate",
    action: "Drainage correction and preventive fungicide",
    district: "Northern Highlands",
  },
  {
    id: "seed-2",
    date: "2026-04-18T08:20:00.000Z",
    monthLabel: "Apr 2026",
    pathogen: "Myzus persicae",
    severity: "Low",
    action: "Sticky-trap monitoring",
    district: "Northern Highlands",
  },
  {
    id: "seed-3",
    date: "2025-12-09T12:10:00.000Z",
    monthLabel: "Dec 2025",
    pathogen: "Spodoptera frugiperda",
    severity: "High",
    action: "Whorl-stage intervention",
    district: "Kicukiro District",
  },
];

function createDefaultFarm() {
  return {
    id: "pest-default-farm",
    name: "Primary Advisory Plot",
    region: "Northern Highlands",
    sizeHectares: 12,
    irrigationType: "Drip Irrigation",
    primaryCrop: "Potato",
    location: { lat: -1.94, lng: 29.87, label: "Primary advisory zone" },
  };
}

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(PEST_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(PEST_STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatRwf(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function inferDistrict(farm) {
  const region = farm?.region || farm?.location?.label || "";
  if (/kicukiro/i.test(region)) return "Kicukiro District";
  if (/gasabo/i.test(region)) return "Gasabo District";
  if (/nyarugenge/i.test(region)) return "Nyarugenge District";
  if (/bugesera/i.test(region)) return "Bugesera District";
  return region.split(",")[0] || "Unknown District";
}

function deriveCropStage(crop) {
  const month = new Date().getMonth();
  const cropMap = {
    Potato: ["Tuber bulking", "Flowering", "Vegetative", "Harvest preparation"],
    Maize: ["Flowering", "Grain filling", "Vegetative", "Harvest preparation"],
    Beans: ["Flowering", "Pod filling", "Vegetative", "Harvest preparation"],
    Tomato: ["Fruit set", "Flowering", "Vegetative", "Harvesting"],
    Vegetables: ["Vegetative", "Leaf expansion", "Transplant recovery", "Harvesting"],
    Cereals: ["Tillering", "Flowering", "Grain filling", "Harvest preparation"],
  };

  const cycle = cropMap[crop] || cropMap.Vegetables;
  return cycle[month % cycle.length];
}

function getPriorityLabel(score) {
  if (score >= 85) return "Critical";
  if (score >= 72) return "High";
  if (score >= 54) return "Medium";
  return "Low";
}

function getRiskLabel(score) {
  if (score >= 80) return "High";
  if (score >= 55) return "Moderate";
  return "Low";
}

function weatherCodeDescription(code) {
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
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
  };
  return mapping[code] || "Variable conditions";
}

function buildWeatherContribution(weather) {
  if (!weather) {
    return {
      current: null,
      forecast: null,
      explanation: "Live weather signals are still loading for this farm.",
    };
  }

  const current = {
    temperature: Number(weather.current?.temperature_2m ?? 0),
    humidity: Number(weather.current?.relative_humidity_2m ?? 0),
    rainfall: Number(weather.current?.rain ?? weather.current?.precipitation ?? 0),
    windSpeed: Number(weather.current?.wind_speed_10m ?? 0),
    description: weatherCodeDescription(Number(weather.current?.weather_code ?? 0)),
  };

  const daily = weather.daily || {};
  const rainSeries = Array.isArray(daily.rain_sum) ? daily.rain_sum : [];
  const humiditySeries = Array.isArray(daily.relative_humidity_2m_max)
    ? daily.relative_humidity_2m_max
    : [];
  const tempSeries = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];

  const totalRain = rainSeries.reduce((sum, value) => sum + Number(value || 0), 0);
  const humidDays = humiditySeries.filter((value) => Number(value || 0) >= 75).length;
  const warmDays = tempSeries.filter((value) => Number(value || 0) >= 24 && Number(value || 0) <= 30).length;
  const forecast = {
    totalRain,
    humidDays,
    warmDays,
    peakHumidity: Math.max(...humiditySeries, current.humidity),
    peakTemperature: Math.max(...tempSeries, current.temperature),
  };

  return {
    current,
    forecast,
    explanation: `Humidity of ${current.humidity}% with ${current.temperature}C conditions and ${totalRain.toFixed(
      1
    )} mm forecast rain shapes pest and disease pressure for the next 7 days.`,
  };
}

function diseaseWeatherScore(disease, weatherContribution) {
  if (!weatherContribution?.current || !weatherContribution?.forecast) {
    return 12;
  }

  const profile = disease.weatherProfile;
  const { current, forecast } = weatherContribution;
  let score = 0;

  if (current.humidity >= profile.humidityMin) score += 12;
  if (current.humidity <= profile.humidityMax) score += 8;
  if (current.temperature >= profile.temperatureMin && current.temperature <= profile.temperatureMax) score += 18;
  if (forecast.totalRain >= profile.rainfallMin) score += 10;
  if (forecast.humidDays >= 3) score += 8;
  if (forecast.warmDays >= 3) score += 8;

  return clamp(score, 0, 64);
}

function computeDiagnoses({
  farm,
  crop,
  symptom,
  affectedArea,
  uploadedImageName,
  weatherContribution,
  historyLog,
}) {
  const cropStage = deriveCropStage(crop);
  const district = inferDistrict(farm);
  const imageBoost = uploadedImageName ? 6 : 0;

  const ranked = diseaseLibrary
    .map((disease) => {
      const cropMatch = disease.affectedCrops.includes(crop)
        ? 28
        : disease.affectedCrops.includes("Vegetables") && (crop === "Tomato" || crop === "Vegetables")
          ? 22
          : disease.affectedCrops.includes("Cereals") && (crop === "Maize" || crop === "Cereals")
            ? 20
            : 0;
      const symptomMatch = disease.symptomWeights[symptom] || 4;
      const weatherMatch = diseaseWeatherScore(disease, weatherContribution);
      const historyMatch = historyLog.filter(
        (entry) =>
          entry.pathogen.toLowerCase().includes(disease.scientificName.split(" ")[0].toLowerCase()) &&
          entry.district === district
      ).length;
      const historyBoost = clamp(historyMatch * 7, 0, 18);
      const areaBoost = affectedArea * 0.18;
      const score = clamp(
        Math.round(cropMatch + symptomMatch + weatherMatch + historyBoost + areaBoost + imageBoost),
        16,
        98
      );

      return {
        ...disease,
        score,
        stageRelevance:
          cropStage.toLowerCase().includes("flower") || cropStage.toLowerCase().includes("bulking")
            ? 1.12
            : 1,
      };
    })
    .map((item) => ({
      ...item,
      weightedScore: clamp(Math.round(item.score * item.stageRelevance), 18, 99),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const top = ranked[0];
  const second = ranked[1];
  const confidence = clamp(
    Math.round(top.weightedScore - (second ? Math.max(0, second.weightedScore - 8) * 0.25 : 0)),
    54,
    97
  );

  const farmRiskScore = clamp(
    Math.round(top.weightedScore * 0.58 + affectedArea * 0.32 + (weatherContribution?.forecast?.humidDays || 0) * 2),
    18,
    98
  );
  const regionalRiskScore = clamp(
    Math.round(top.weightedScore * 0.42 + (weatherContribution?.forecast?.totalRain || 0) * 1.1 + (weatherContribution?.forecast?.peakHumidity || 0) * 0.25),
    18,
    99
  );

  const yieldLoss = clamp(Math.round(farmRiskScore * 0.16 + affectedArea * 0.12), 4, 38);
  const economics = cropEconomics[crop] || cropEconomics.Vegetables;
  const fieldArea = Number(farm?.sizeHectares || 1);
  const economicLoss = Math.round(((economics.yieldPerHa * fieldArea * 1000 * economics.pricePerKg) * yieldLoss) / 100);

  const currentRisk = getRiskLabel(farmRiskScore);
  const forecastRiskScore = clamp(
    Math.round(farmRiskScore + (weatherContribution?.forecast?.humidDays || 0) * 4 + ((weatherContribution?.forecast?.totalRain || 0) > 18 ? 8 : 0)),
    20,
    99
  );
  const forecastRisk = getRiskLabel(forecastRiskScore);
  const priorityScore = clamp(
    Math.round(confidence * 0.35 + farmRiskScore * 0.35 + regionalRiskScore * 0.15 + affectedArea * 0.15),
    20,
    100
  );
  const priority = getPriorityLabel(priorityScore);

  return {
    ranked,
    topDiagnosis: top,
    confidence,
    cropStage,
    currentRisk,
    forecastRisk,
    farmRiskScore,
    regionalRiskScore,
    yieldLoss,
    economicLoss,
    priority,
    district,
    explanation: {
      soil: `${farm?.landType || "Field"} conditions on ${farm?.name} increase canopy vulnerability where nutrient stress and moisture imbalance are present.`,
      weather: weatherContribution?.explanation || "Weather context is still being loaded for this farm.",
      market: `Potential ${formatRwf(economicLoss)} loss is significant for ${crop} supply planning and market timing.`,
      stage: `${crop} is currently in the ${cropStage} stage, which raises sensitivity to ${top.name.toLowerCase()}.`,
      confidence: `Confidence combines symptom strength, crop fit, weather suitability, prior outbreaks in ${district}, and image evidence.`,
    },
    outbreakForecast: {
      currentRisk,
      predictedRisk: forecastRisk,
      confidence: clamp(Math.round(confidence - 4 + (weatherContribution?.forecast?.humidDays || 0)), 52, 96),
      drivers: `Humidity above ${weatherContribution?.forecast?.peakHumidity || weatherContribution?.current?.humidity || 0}% and ${(
        weatherContribution?.forecast?.totalRain || 0
      ).toFixed(1)} mm of rain over the next 7 days increase outbreak pressure.`,
    },
  };
}

function buildDynamicRecommendation(diagnosisModel, farm, crop) {
  const top = diagnosisModel.topDiagnosis;
  return {
    recommendationId: `rec-${farm.id}-${top.id}`,
    diseaseName: top.name,
    actionType: "Pest/Disease",
    title: `Control ${top.name} on ${farm.name}`,
    accepted: 0,
    rejected: 0,
    completed: 0,
    guidance: [
      `Scout ${farm.name} within 24 hours and confirm ${top.name.toLowerCase()} hotspots.`,
      `Apply the primary intervention suited to ${crop}: ${top.treatment.chemical}.`,
      `Reassess in 3-5 days and update image evidence if symptoms expand.`,
    ],
  };
}

export function PestsPage() {
  const { user } = useAuth();
  const { currentFarms } = useFarmerData();
  const fallbackFarm = useMemo(() => createDefaultFarm(), []);
  const farms = useMemo(
    () => (currentFarms.length ? currentFarms : [fallbackFarm]),
    [currentFarms, fallbackFarm]
  );
  const stored = useMemo(() => loadStoredState(), []);

  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "pest-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(farms[0]?.primaryCrop || "Potato");
  const [selectedSymptom, setSelectedSymptom] = useState("Yellow Spots");
  const [affectedArea, setAffectedArea] = useState(28);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [historyLog, setHistoryLog] = useState(() => stored.historyLog || outbreakHistorySeed);
  const [actionLog, setActionLog] = useState(() => stored.actionLog || []);
  const [backendDiagnosis, setBackendDiagnosis] = useState(null);
  const [backendHistoryLog, setBackendHistoryLog] = useState([]);
  const [backendActionLog, setBackendActionLog] = useState([]);
  const [backendLibrary, setBackendLibrary] = useState([]);
  const [pestState, setPestState] = useState({
    loading: false,
    notice: "",
    source: "Demo Pest Data",
  });
  const [weatherState, setWeatherState] = useState({
    loading: true,
    error: "",
    data: null,
    lastUpdated: "",
  });

  useEffect(() => {
    saveStoredState({ historyLog, actionLog });
  }, [historyLog, actionLog]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );
  const backendFarmId = selectedFarm?.backendFarmId || "";
  const backendMode = isBackendSessionActive() && Boolean(backendFarmId);

  useEffect(() => {
    setSelectedCrop(selectedFarm?.primaryCrop || "Potato");
  }, [selectedFarm?.id, selectedFarm?.primaryCrop]);

  useEffect(() => {
    let active = true;
    async function loadWeather() {
      if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
        setWeatherState({
          loading: false,
          error: "Demo weather context is being used until this farm has valid coordinates.",
          data: null,
          lastUpdated: "",
        });
        return;
      }

      setWeatherState((current) => ({ ...current, loading: true, error: "" }));
      try {
        const response = await apiClient.weather.forecast(selectedFarm.location.lat, selectedFarm.location.lng, {
          timeoutMs: 4500,
        });
        if (!active) return;
        setWeatherState({
          loading: false,
          error: "",
          data: response,
          lastUpdated: response.current?.time || new Date().toISOString(),
        });
      } catch {
        if (!active) return;
        setWeatherState({
          loading: false,
          error: "Live weather is temporarily unavailable, so demo weather context is being used for pest forecasting.",
          data: null,
          lastUpdated: "",
        });
      }
    }

    loadWeather();
    return () => {
      active = false;
    };
  }, [selectedFarm?.id, selectedFarm?.location?.lat, selectedFarm?.location?.lng]);

  const weatherContribution = useMemo(
    () => buildWeatherContribution(weatherState.data),
    [weatherState.data]
  );

  const diagnosisModel = useMemo(
    () =>
      computeDiagnoses({
        farm: selectedFarm,
        crop: selectedCrop,
        symptom: selectedSymptom,
        affectedArea,
        uploadedImageName,
        weatherContribution,
        historyLog,
      }),
    [affectedArea, historyLog, selectedCrop, selectedFarm, selectedSymptom, uploadedImageName, weatherContribution]
  );

  useEffect(() => {
    let active = true;

    if (!backendMode || !backendFarmId) {
      setBackendDiagnosis(null);
      setBackendHistoryLog([]);
      setBackendActionLog([]);
      setBackendLibrary([]);
      setPestState({
        loading: false,
        notice: "Using demo/local pest intelligence for this farm.",
        source: "Demo Pest Data",
      });
      return undefined;
    }

    async function loadBackendPestData() {
      setPestState({
        loading: true,
        notice: "",
        source: "Backend Pest Data",
      });

      try {
        const [latest, history, library] = await Promise.all([
          phase1BackendService.pests.latest(backendFarmId),
          phase1BackendService.pests.history(backendFarmId),
          phase1BackendService.pests.library({ crop: selectedCrop }),
        ]);

        if (!active) return;

        setBackendDiagnosis(latest || null);
        setBackendHistoryLog(history || []);
        setBackendLibrary(library || []);

        if (latest?.id) {
          const actions = await phase1BackendService.pests.listActions(latest.id);
          if (!active) return;
          setBackendActionLog(actions || []);
        } else {
          setBackendActionLog([]);
        }

        setPestState({
          loading: false,
          notice: latest
            ? "Using backend pest diagnosis history with demo fallback preserved."
            : "No backend pest diagnosis exists yet for this farm. Demo intelligence remains available.",
          source: latest ? "Backend Pest Data" : "Demo Pest Data",
        });
      } catch (error) {
        if (!active) return;
        console.warn("Pest backend load failed. Falling back to demo pest intelligence.", error);
        setBackendDiagnosis(null);
        setBackendHistoryLog([]);
        setBackendActionLog([]);
        setBackendLibrary([]);
        setPestState({
          loading: false,
          notice: "Backend pest data is unavailable right now. Showing demo pest intelligence for presentation mode.",
          source: "Demo Pest Data",
        });
      }
    }

    loadBackendPestData();

    return () => {
      active = false;
    };
  }, [backendFarmId, backendMode, selectedCrop]);

  const dynamicRecommendation = useMemo(
    () => buildDynamicRecommendation(diagnosisModel, selectedFarm, selectedCrop),
    [diagnosisModel, selectedCrop, selectedFarm]
  );

  const activeDiagnosis = backendDiagnosis || diagnosisModel;
  const activeRecommendation = activeDiagnosis?.recommendation || dynamicRecommendation;
  const activeHistoryLog = backendMode && backendHistoryLog.length ? backendHistoryLog : historyLog;

  const trackedRecommendation = useMemo(
    () => {
      const source = backendMode ? backendActionLog : actionLog;
      return source
        .filter((entry) => entry.recommendationId === activeRecommendation.recommendationId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    [actionLog, activeRecommendation.recommendationId, backendActionLog, backendMode]
  );

  const treatmentEffectiveness = useMemo(() => {
    const completed = trackedRecommendation.filter((entry) => entry.feedbackStatus === "completed").length;
    const accepted = trackedRecommendation.filter((entry) => entry.feedbackStatus === "accepted").length;
    if (!accepted) return 0;
    return Math.round((completed / accepted) * 100);
  }, [trackedRecommendation]);

  const displayedLibrary = useMemo(
    () =>
      (backendLibrary.length ? backendLibrary : diagnosisModel.ranked).filter((item) => {
        const query = librarySearch.toLowerCase();
        return (
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.scientificName.toLowerCase().includes(query) ||
          item.affectedCrops.join(" ").toLowerCase().includes(query)
        );
      }),
    [backendLibrary, diagnosisModel.ranked, librarySearch]
  );

  const regionalTracking = useMemo(() => {
    const totalDistrictEvents = activeHistoryLog.filter((entry) => entry.district === activeDiagnosis.district).length;
    const trend =
      activeDiagnosis.outbreakForecast.predictedRisk === "High"
        ? "Increasing"
        : activeDiagnosis.outbreakForecast.predictedRisk === "Moderate"
          ? "Stable"
          : "Decreasing";
    return {
      district: activeDiagnosis.district,
      intensity: clamp(Math.round(activeDiagnosis.regionalRiskScore / 10), 2, 10),
      trend,
      clusterCount: 2 + totalDistrictEvents,
    };
  }, [activeDiagnosis, activeHistoryLog]);

  const activityFeed = useMemo(() => {
    const items = [
      {
        id: "weather-link",
        tone: activeDiagnosis.outbreakForecast.predictedRisk === "High" ? "critical" : "review",
        title: "Weather-driven outbreak pressure updated",
        detail: weatherContribution.explanation,
        timestamp: weatherState.lastUpdated || new Date().toISOString(),
      },
      {
        id: "diagnosis",
        tone: activeDiagnosis.priority === "Critical" ? "critical" : "review",
        title: `${activeDiagnosis.topDiagnosis.name} detected for ${selectedCrop}`,
        detail: `${activeDiagnosis.currentRisk} current risk with ${activeDiagnosis.confidence}% confidence on ${selectedFarm.name}.`,
        timestamp: new Date().toISOString(),
      },
      ...trackedRecommendation.map((entry) => ({
        id: entry.id,
        tone: entry.feedbackStatus === "completed" ? "live" : entry.feedbackStatus === "rejected" ? "critical" : "review",
        title: `Farmer action ${entry.feedbackStatus}`,
        detail:
          entry.feedbackStatus === "rejected" && entry.rejectionReason
            ? `Recommendation rejected: ${entry.rejectionReason}.`
            : `Recommendation ${entry.feedbackStatus} for ${entry.actionType}.`,
        timestamp: entry.timestamp,
      })),
    ];

    return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
  }, [activeDiagnosis, selectedCrop, selectedFarm.name, trackedRecommendation, weatherContribution.explanation, weatherState.lastUpdated]);

  const submitSymptomCheck = async () => {
    if (backendMode && backendFarmId) {
      try {
        setPestState((current) => ({ ...current, loading: true, notice: "" }));
        const diagnosis = await phase1BackendService.pests.analyze(backendFarmId, {
          crop: selectedCrop,
          symptom: selectedSymptom,
          affectedArea,
          uploadedImageName,
          weatherContribution,
        });
        setBackendDiagnosis(diagnosis);
        setBackendHistoryLog(diagnosis.historyLog || []);
        setBackendLibrary(diagnosis.library || []);
        setBackendActionLog([]);
        setPestState({
          loading: false,
          notice: `Backend pest diagnosis saved for ${selectedCrop} on ${selectedFarm.name}.`,
          source: "Backend Pest Data",
        });
        return;
      } catch (error) {
        console.warn("Backend pest analysis failed. Falling back to local history entry.", error);
        setPestState({
          loading: false,
          notice: "Backend pest diagnosis is unavailable right now. Local demo pest logic is still active.",
          source: "Demo Pest Data",
        });
      }
    }

    const event = {
      id: `history-${Date.now()}`,
      date: new Date().toISOString(),
      monthLabel: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()),
      pathogen: diagnosisModel.topDiagnosis.scientificName,
      severity: diagnosisModel.currentRisk,
      action: diagnosisModel.priority === "Critical" ? "Immediate field intervention" : "Guided field scouting",
      district: diagnosisModel.district,
    };

    setHistoryLog((current) => [event, ...current].slice(0, 10));
  };

  const trackRecommendation = async (feedbackStatus) => {
    if (backendMode && activeDiagnosis?.id && activeRecommendation?.recommendationId) {
      try {
        const created = await phase1BackendService.pests.addAction(activeDiagnosis.id, {
          recommendationId: activeRecommendation.recommendationId,
          actionType: activeRecommendation.actionType || "Pest/Disease",
          feedbackStatus,
          rejectionReason: "",
        });
        setBackendActionLog((current) => [created, ...current].slice(0, 30));
        setPestState((current) => ({
          ...current,
          notice: `Backend farmer action recorded as ${feedbackStatus}.`,
          source: "Backend Pest Data",
        }));
        return;
      } catch (error) {
        console.warn("Backend pest action logging failed. Falling back to local action log.", error);
      }
    }

    const nextRecord = {
      id: `pest-action-${Date.now()}`,
      recommendationId: activeRecommendation.recommendationId,
      farmerId: user?.id || "demo-farmer",
      farmId: selectedFarm.id,
      actionType: activeRecommendation.actionType,
      feedbackStatus,
      rejectionReason: "",
      timestamp: new Date().toISOString(),
    };
    setActionLog((current) => [nextRecord, ...current].slice(0, 30));
  };

  const downloadProtocol = () => {
    downloadTextFile(
      `${diagnosisModel.topDiagnosis.name.toLowerCase().replace(/\s+/g, "-")}-protocol.txt`,
      `Protocol: ${activeDiagnosis.topDiagnosis.name}\nConfidence: ${activeDiagnosis.confidence}%\nRisk: ${activeDiagnosis.currentRisk}\nPriority: ${activeDiagnosis.priority}\n\nChemical treatment:\n${activeDiagnosis.topDiagnosis.treatment.chemical}\n\nOrganic / IPM:\n${activeDiagnosis.topDiagnosis.treatment.organic}\n\nPreventive measure:\n${activeDiagnosis.topDiagnosis.preventionAdvice}`
    );
  };

  const downloadHistoryReport = () => {
    downloadJsonFile("pest-disease-history.json", {
      farm: selectedFarm,
      crop: selectedCrop,
      symptom: selectedSymptom,
      affectedArea,
      weatherContribution,
      diagnosisModel: activeDiagnosis,
      historyLog: activeHistoryLog,
      actionLog: trackedRecommendation,
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="Pest &amp; Disease Intelligence"
        subtitle="AI-assisted pest and disease risk detection using symptoms, crop, weather, outbreak records, and image evidence."
        actions={
          <div className="pdi-header-actions">
            <ActionButton variant="secondary" size="sm" onClick={downloadProtocol}>
              <Download size={14} />
              <span>Protocol</span>
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={downloadHistoryReport}>
              <Download size={14} />
              <span>Export</span>
            </ActionButton>
          </div>
        }
      />

      <div className="pdi-filter-bar">
        <div className="pdi-filter-left">
          <label className="pdi-filter-field">
            <span className="pdi-filter-label">Farm</span>
            <select value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)}>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name} &mdash; {farm.region}</option>
              ))}
            </select>
          </label>
          <label className="pdi-filter-field">
            <span className="pdi-filter-label">Crop</span>
            <select value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
              {cropOptions.map((crop) => (<option key={crop} value={crop}>{crop}</option>))}
            </select>
          </label>
          <label className="pdi-filter-field">
            <span className="pdi-filter-label">Symptom</span>
            <select value={selectedSymptom} onChange={(e) => setSelectedSymptom(e.target.value)}>
              {symptomOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </label>
        </div>
        <div className="pdi-filter-right">
          <StatusBadge variant={pestState.source === "Backend Pest Data" ? "success" : "default"}>
            {pestState.source}
          </StatusBadge>
          {backendMode ? <StatusBadge variant="info">Backend linked</StatusBadge> : null}
        </div>
      </div>

      {pestState.notice ? (
        <div className="pdi-notice"><Info size={14} /><span>{pestState.notice}</span></div>
      ) : null}
      {weatherState.error ? (
        <div className="pdi-warning"><AlertTriangle size={14} /><span>{weatherState.error}</span></div>
      ) : null}

      <div className="pdi-kpi-grid">
        <div className="pdi-kpi-card">
          <div className={`pdi-kpi-icon ${activeDiagnosis.outbreakForecast.currentRisk === "High" ? "red" : activeDiagnosis.outbreakForecast.currentRisk === "Moderate" ? "amber" : "green"}`}>
            <ShieldAlert size={20} />
          </div>
          <div className="pdi-kpi-body">
            <span className="pdi-kpi-label">Current Risk</span>
            <strong className="pdi-kpi-value">{activeDiagnosis.outbreakForecast.currentRisk}</strong>
          </div>
          <span className={`pdi-kpi-badge ${activeDiagnosis.outbreakForecast.currentRisk === "High" ? "red" : activeDiagnosis.outbreakForecast.currentRisk === "Moderate" ? "amber" : "green"}`}>
            {activeDiagnosis.outbreakForecast.currentRisk}
          </span>
        </div>
        <div className="pdi-kpi-card">
          <div className={`pdi-kpi-icon ${activeDiagnosis.outbreakForecast.predictedRisk === "High" ? "red" : activeDiagnosis.outbreakForecast.predictedRisk === "Moderate" ? "amber" : "green"}`}>
            <CloudLightning size={20} />
          </div>
          <div className="pdi-kpi-body">
            <span className="pdi-kpi-label">Predicted Risk</span>
            <strong className="pdi-kpi-value">{activeDiagnosis.outbreakForecast.predictedRisk}</strong>
          </div>
          <span className={`pdi-kpi-badge ${activeDiagnosis.outbreakForecast.predictedRisk === "High" ? "red" : activeDiagnosis.outbreakForecast.predictedRisk === "Moderate" ? "amber" : "green"}`}>
            {activeDiagnosis.outbreakForecast.predictedRisk}
          </span>
        </div>
        <div className="pdi-kpi-card">
          <div className="pdi-kpi-icon green"><BadgeCheck size={20} /></div>
          <div className="pdi-kpi-body">
            <span className="pdi-kpi-label">AI Confidence</span>
            <strong className="pdi-kpi-value">{activeDiagnosis.outbreakForecast.confidence}<small>%</small></strong>
            <div className="pdi-kpi-bar"><div className="pdi-kpi-bar-fill" style={{ width: `${activeDiagnosis.outbreakForecast.confidence}%` }} /></div>
          </div>
        </div>
        <div className="pdi-kpi-card">
          <div className={`pdi-kpi-icon ${activeDiagnosis.yieldLoss >= 30 ? "red" : activeDiagnosis.yieldLoss >= 15 ? "amber" : "green"}`}>
            <TrendingDown size={20} />
          </div>
          <div className="pdi-kpi-body">
            <span className="pdi-kpi-label">Yield Loss</span>
            <strong className="pdi-kpi-value">{activeDiagnosis.yieldLoss}<small>%</small></strong>
            <span className="pdi-kpi-sub">Estimated crop reduction</span>
          </div>
        </div>
        <div className="pdi-kpi-card">
          <div className={`pdi-kpi-icon ${activeDiagnosis.economicLoss >= 1000000 ? "red" : activeDiagnosis.economicLoss >= 500000 ? "amber" : "green"}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="pdi-kpi-body">
            <span className="pdi-kpi-label">Economic Loss</span>
            <strong className="pdi-kpi-value">{formatRwf(activeDiagnosis.economicLoss)}</strong>
          </div>
        </div>
      </div>

      <div className="pdi-main-layout">
        <div className="pdi-main-left">

          <div className="pdi-diagnosis-row">
            <div className="pdi-diagnosis-card">
              <div className="pdi-diag-image-wrap">
                <img
                  src={activeDiagnosis.topDiagnosis.imageUrl}
                  alt={activeDiagnosis.topDiagnosis.name}
                  className="pdi-diag-image"
                  onError={(e) => { e.target.style.opacity = "0"; }}
                />
                <span className="pdi-img-letter">{activeDiagnosis.topDiagnosis.name.charAt(0)}</span>
                <div className="pdi-diag-image-overlay">
                  <StatusBadge variant={activeDiagnosis.priority === "Critical" ? "error" : activeDiagnosis.priority === "High" ? "warning" : "info"}>
                    {activeDiagnosis.priority} Priority
                  </StatusBadge>
                  <span className="pdi-diag-conf">{activeDiagnosis.confidence}% AI match</span>
                </div>
              </div>
              <div className="pdi-diag-body">
                <div className="pdi-diag-head">
                  <div>
                    <h2>{activeDiagnosis.topDiagnosis.name}</h2>
                    <span className="pdi-diag-sci">{activeDiagnosis.topDiagnosis.scientificName}</span>
                  </div>
                </div>
                <div className="pdi-diag-meta-grid">
                  <div className="pdi-diag-meta-item">
                    <span className="pdi-diag-meta-label">Affected Crop</span>
                    <strong>{selectedCrop}</strong>
                  </div>
                  <div className="pdi-diag-meta-item">
                    <span className="pdi-diag-meta-label">Crop Stage</span>
                    <strong>{activeDiagnosis.cropStage}</strong>
                  </div>
                  <div className="pdi-diag-meta-item">
                    <span className="pdi-diag-meta-label">Symptoms</span>
                    <strong>{selectedSymptom}</strong>
                  </div>
                  <div className="pdi-diag-meta-item">
                    <span className="pdi-diag-meta-label">Weather Trigger</span>
                    <strong>{weatherContribution.current?.humidity ?? "--"}% / {weatherContribution.current?.temperature ?? "--"}&deg;C</strong>
                  </div>
                </div>
                <div className="pdi-diag-weather-line">
                  <ThermometerSun size={14} />
                  <span>Humidity {weatherContribution.current?.humidity ?? "--"}% &amp; {weatherContribution.current?.temperature ?? "--"}C &mdash; favorable for {activeDiagnosis.topDiagnosis.name.toLowerCase()}</span>
                </div>
                <p className="pdi-diag-explanation">{weatherContribution.explanation}</p>
                <div className="pdi-diag-actions">
                  <ActionButton variant="primary" size="sm" onClick={() => trackRecommendation("accepted")}>
                    <CheckCircle2 size={14} /><span>Accept Recommendation</span>
                  </ActionButton>
                  <ActionButton variant="secondary" size="sm" onClick={() => trackRecommendation("completed")}>
                    <BadgeCheck size={14} /><span>Mark Complete</span>
                  </ActionButton>
                  <ActionButton variant="secondary" size="sm" onClick={() => trackRecommendation("rejected")}>
                    <X size={14} /><span>Reject</span>
                  </ActionButton>
                </div>
              </div>
            </div>

            <div className="pdi-symptom-card">
              <div className="pdi-card-head">
                <Bug size={18} />
                <h3>Symptom Checker</h3>
              </div>
              <div className="pdi-symptom-body">
                <div className="pdi-symptom-info">
                  <div className="pdi-symptom-info-item">
                    <span className="pdi-symptom-info-label">Farm</span>
                    <strong>{selectedFarm.name}</strong>
                  </div>
                  <div className="pdi-symptom-info-item">
                    <span className="pdi-symptom-info-label">Crop</span>
                    <strong>{selectedCrop}</strong>
                  </div>
                </div>
                <div className="pdi-symptom-chips">
                  <span className="pdi-chips-label">Symptoms</span>
                  <div className="pdi-chips-row">
                    {symptomOptions.map((symptom) => (
                      <button key={symptom} type="button" className={`pdi-chip ${selectedSymptom === symptom ? "active" : ""}`} onClick={() => setSelectedSymptom(symptom)}>
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pdi-slider-row">
                  <span className="pdi-slider-label">Affected Area: <strong>{affectedArea}%</strong></span>
                  <input type="range" min="0" max="100" value={affectedArea} onChange={(e) => setAffectedArea(Number(e.target.value))} className="pdi-range" />
                </div>
                <div className="pdi-upload-area">
                  {uploadedImageName ? (
                    <div className="pdi-upload-preview">
                      <span className="pdi-upload-name"><ImageUp size={14} /> {uploadedImageName}</span>
                      <button type="button" className="pdi-upload-remove" onClick={() => setUploadedImageName("")}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="pdi-upload-label">
                      <Upload size={18} />
                      <span>Upload crop image</span>
                      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="pdi-upload-input" onChange={(e) => setUploadedImageName(e.target.files?.[0]?.name || "")} />
                    </label>
                  )}
                </div>
                <div className="pdi-weather-mini">
                  <span><Thermometer size={14} /> {weatherContribution.current?.temperature ?? "--"}C</span>
                  <span><Droplets size={14} /> {weatherContribution.current?.humidity ?? "--"}%</span>
                  <span><CloudDrizzle size={14} /> {(weatherContribution.forecast?.totalRain ?? 0).toFixed(1)}mm/7d</span>
                </div>
                <div className="pdi-symptom-actions">
                  <ActionButton variant="primary" size="sm" onClick={submitSymptomCheck}>
                    <Search size={14} /><span>Analyze Symptoms</span>
                  </ActionButton>
                  <ActionButton variant="secondary" size="sm" onClick={() => { setSelectedSymptom("Yellow Spots"); setAffectedArea(28); setUploadedImageName(""); }}>
                    <RefreshCw size={14} /><span>Reset</span>
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>

          <div className="pdi-forecast-card">
            <div className="pdi-card-head">
              <CloudLightning size={18} />
              <h3>7-Day Outbreak Forecast</h3>
            </div>
            <div className="pdi-forecast-body">
              <div className="pdi-forecast-days">
                {(() => {
                  const today = new Date();
                  const risks = ["Low", "Moderate", "High", "Moderate", "High", "Moderate", "Low"];
                  const weathers = ["Partly Cloudy", "Light Rain", "Heavy Rain", "Light Rain", "Overcast", "Light Rain", "Clear"];
                  return Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() + i);
                    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const risk = i === 0 ? activeDiagnosis.outbreakForecast.currentRisk : i === 1 ? activeDiagnosis.outbreakForecast.predictedRisk : risks[i];
                    const weather = weathers[i];
                    const isMax = risk === "High";
                    return (
                      <div key={i} className={`pdi-forecast-day ${isMax ? "high" : ""}`}>
                        <span className="pdi-fd-name">{dayName}</span>
                        <span className="pdi-fd-date">{dateStr}</span>
                        <div className={`pdi-fd-risk ${risk.toLowerCase()}`}>{risk}</div>
                        <span className="pdi-fd-weather">{weather}</span>
                        <div className="pdi-fd-stats">
                          <span><Droplets size={10} /> {60 + i * 4}%</span>
                          <span><CloudDrizzle size={10} /> {2 + i * 3}mm</span>
                        </div>
                        <span className="pdi-fd-action">{isMax ? "Scout fields" : "Monitor"}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="pdi-forecast-drivers">{activeDiagnosis.outbreakForecast.drivers}</p>
            </div>
          </div>

          <div className="pdi-treatment-row">
            <div className="pdi-treatment-card chemical">
              <div className="pdi-treat-head">
                <ShieldCheck size={18} />
                <span className="pdi-treat-icon-bg">Chem</span>
              </div>
              <strong>Chemical Control</strong>
              <p>{activeDiagnosis.topDiagnosis.treatment.chemical}</p>
              <div className="pdi-treat-meta">
                <span className="pdi-treat-timing"><Clock size={12} /> Apply within 24-48h</span>
                <span className="pdi-treat-safety"><ShieldAlert size={12} /> Use protective gear</span>
              </div>
              <div className="pdi-treat-eff"><div className="pdi-treat-eff-fill" style={{ width: "85%" }} />85% effective</div>
            </div>
            <div className="pdi-treatment-card organic">
              <div className="pdi-treat-head">
                <Sparkles size={18} />
                <span className="pdi-treat-icon-bg">IPM</span>
              </div>
              <strong>Organic / IPM Control</strong>
              <p>{activeDiagnosis.topDiagnosis.treatment.organic}</p>
              <div className="pdi-treat-meta">
                <span className="pdi-treat-timing"><Clock size={12} /> Apply at first sign</span>
                <span className="pdi-treat-safety"><ShieldAlert size={12} /> Safe for beneficials</span>
              </div>
              <div className="pdi-treat-eff"><div className="pdi-treat-eff-fill" style={{ width: "72%" }} />72% effective</div>
            </div>
            <div className="pdi-treatment-card preventive">
              <div className="pdi-treat-head">
                <CheckCircle2 size={18} />
                <span className="pdi-treat-icon-bg">Prev</span>
              </div>
              <strong>Preventive Action</strong>
              <p>{activeDiagnosis.topDiagnosis.preventionAdvice}</p>
              <div className="pdi-treat-meta">
                <span className="pdi-treat-timing"><Clock size={12} /> Ongoing practice</span>
                <span className="pdi-treat-safety"><ShieldAlert size={12} /> No chemicals needed</span>
              </div>
              <div className="pdi-treat-eff"><div className="pdi-treat-eff-fill" style={{ width: "90%" }} />90% preventive</div>
            </div>
          </div>

          <AppCard>
            <div className="pdi-card-head">
              <Sparkles size={18} />
              <h3>Why This Diagnosis?</h3>
            </div>
            <div className="pdi-explain-grid">
              <div className="pdi-explain-item">
                <div className="pdi-explain-icon"><CloudLightning size={16} /></div>
                <div>
                  <strong>Weather Trigger</strong>
                  <p>{activeDiagnosis.explanation.weather}</p>
                </div>
              </div>
              <div className="pdi-explain-item">
                <div className="pdi-explain-icon"><MapPinned size={16} /></div>
                <div>
                  <strong>Farm Risk</strong>
                  <p>{activeDiagnosis.explanation.soil}</p>
                </div>
              </div>
              <div className="pdi-explain-item">
                <div className="pdi-explain-icon"><Sprout size={16} /></div>
                <div>
                  <strong>Crop Stage</strong>
                  <p>{activeDiagnosis.explanation.stage}</p>
                </div>
              </div>
              <div className="pdi-explain-item">
                <div className="pdi-explain-icon"><Target size={16} /></div>
                <div>
                  <strong>Symptom Match</strong>
                  <p>Symptoms of "{selectedSymptom}" match the known profile of {activeDiagnosis.topDiagnosis.name} with strong correlation.</p>
                </div>
              </div>
              <div className="pdi-explain-item">
                <div className="pdi-explain-icon"><AlertTriangle size={16} /></div>
                <div>
                  <strong>Economic Impact</strong>
                  <p>{activeDiagnosis.explanation.market}</p>
                </div>
              </div>
              <div className="pdi-explain-item">
                <div className="pdi-explain-icon"><BadgeCheck size={16} /></div>
                <div>
                  <strong>AI Confidence</strong>
                  <p>{activeDiagnosis.explanation.confidence}</p>
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard>
            <div className="pdi-card-head">
              <Search size={18} />
              <h3>Disease Library</h3>
              <input type="text" placeholder="Search diseases/pests..." value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} className="pdi-search-input" />
            </div>
            <div className="pdi-library-grid">
              {displayedLibrary.map((card) => (
                <div key={card.id} className="pdi-library-card">
                  <div className="pdi-lib-img-wrap">
                    <img src={card.imageUrl} alt={card.name} className="pdi-lib-img" onError={(e) => { e.target.style.opacity = "0"; }} />
                    <span className="pdi-img-letter">{card.name.charAt(0)}</span>
                    <StatusBadge variant={card.affectedCrops.includes(selectedCrop) ? "success" : "default"}>{selectedCrop}</StatusBadge>
                  </div>
                  <div className="pdi-lib-body">
                    <h4>{card.name}</h4>
                    <span className="pdi-lib-sci">{card.scientificName}</span>
                    <div className="pdi-lib-tags">
                      <span className="pdi-lib-tag crop">{card.affectedCrops.join(", ")}</span>
                      <span className="pdi-lib-tag symptom">{card.commonSymptoms.join(", ")}</span>
                    </div>
                    <p className="pdi-lib-prev">{card.preventionAdvice}</p>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        </div>

        <div className="pdi-main-right">
          <AppCard>
            <div className="pdi-card-head">
              <MapPinned size={18} />
              <h3>Regional Outbreak Tracking</h3>
            </div>
            <div className="pdi-regional-body">
              <div className="pdi-regional-top">
                <div className="pdi-regional-district">
                  <strong>{regionalTracking.district}</strong>
                  <span className={`pdi-risk-badge ${activeDiagnosis.outbreakForecast.currentRisk.toLowerCase()}`}>
                    {activeDiagnosis.outbreakForecast.currentRisk} Risk
                  </span>
                </div>
                <div className="pdi-regional-intensity">
                  <span>Outbreak Intensity</span>
                  <div className="pdi-intensity-bar-bg">
                    <div className="pdi-intensity-bar-fill" style={{ width: `${regionalTracking.intensity * 10}%` }} />
                  </div>
                  <strong>{regionalTracking.intensity}/10</strong>
                </div>
              </div>
              <div className="pdi-regional-stats">
                <div className="pdi-regional-stat">
                  <span className="pdi-reg-stat-label">Trend</span>
                  <span className={`pdi-reg-stat-value ${regionalTracking.trend === "Increasing" ? "up" : regionalTracking.trend === "Decreasing" ? "down" : ""}`}>
                    {regionalTracking.trend === "Increasing" ? <TrendingUp size={14} /> : regionalTracking.trend === "Decreasing" ? <TrendingDown size={14} /> : null}
                    {regionalTracking.trend}
                  </span>
                </div>
                <div className="pdi-regional-stat">
                  <span className="pdi-reg-stat-label">Nearby Cases</span>
                  <strong className="pdi-reg-stat-value">{regionalTracking.clusterCount}</strong>
                </div>
              </div>
              <div className="pdi-regional-map">
                <div className="pdi-reg-map-visual">
                  <MapPinned size={18} className="pdi-reg-map-farm" />
                  <div className="pdi-reg-map-marker" style={{ top: "30%", left: "60%" }} />
                  <div className="pdi-reg-map-marker" style={{ top: "55%", left: "40%" }} />
                  <div className="pdi-reg-map-marker" style={{ top: "45%", left: "70%" }} />
                </div>
                <span className="pdi-reg-map-label">2.5 km radius &bull; {regionalTracking.clusterCount} confirmed events</span>
              </div>
            </div>
          </AppCard>

          <AppCard>
            <div className="pdi-card-head">
              <FileClock size={18} />
              <h3>Historical Records</h3>
            </div>
            <div className="pdi-history-table">
              <div className="pdi-history-head">
                <span>Date</span>
                <span>Pathogen</span>
                <span>Severity</span>
                <span>Action Taken</span>
                <span>Outcome</span>
              </div>
              {activeHistoryLog.slice(0, 6).map((row) => (
                <div key={row.id || `${row.date}-${row.pathogen}`} className="pdi-history-row">
                  <span className="pdi-h-date">{row.monthLabel || new Date(row.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                  <strong className="pdi-h-pathogen">{row.pathogen}</strong>
                  <span className={`pdi-h-severity ${String(row.severity).toLowerCase()}`}>{row.severity}</span>
                  <span className="pdi-h-action">{row.action}</span>
                  <span className={`pdi-h-outcome ${row.severity === "Low" ? "good" : row.severity === "Moderate" ? "warn" : "bad"}`}>
                    {row.severity === "Low" ? "Controlled" : row.severity === "Moderate" ? "Managed" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard>
            <div className="pdi-card-head">
              <BadgeCheck size={18} />
              <h3>Recommendation Tracker</h3>
            </div>
            <div className="pdi-rec-body">
              <div className="pdi-rec-card">
                <div className="pdi-rec-title">{activeRecommendation.title}</div>
                <div className="pdi-rec-eff">
                  <span>Tractor Effect</span>
                  <div className="pdi-rec-eff-bar"><div className="pdi-rec-eff-fill" style={{ width: `${treatmentEffectiveness}%` }} /></div>
                  <strong>{treatmentEffectiveness}%</strong>
                </div>
              </div>
              <div className="pdi-rec-guidance">
                <strong>Steps</strong>
                <ol>
                  {activeRecommendation.guidance.map((item) => (<li key={item}>{item}</li>))}
                </ol>
              </div>
              <div className="pdi-rec-tracking">
                <strong>Activity Log</strong>
                {trackedRecommendation.length ? (
                  trackedRecommendation.slice(0, 4).map((entry) => (
                    <div key={entry.id} className="pdi-rec-entry">
                      <StatusBadge variant={entry.feedbackStatus === "completed" ? "success" : entry.feedbackStatus === "accepted" ? "info" : "error"}>
                        {entry.feedbackStatus}
                      </StatusBadge>
                      <span className="pdi-rec-date">{formatShortDate(entry.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <p className="pdi-empty">No action feedback recorded yet.</p>
                )}
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      {weatherState.loading || pestState.loading ? (
        <div className="pdi-loading">
          <span>Loading pest intelligence...</span>
        </div>
      ) : null}
    </PageShell>
  );
}
