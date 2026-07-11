import {
  Activity,
  BellRing,
  CloudRain,
  Download,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageSquareText,
  RadioTower,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Sprout,
  Store,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { downloadCsvFile, downloadJsonFile, downloadTextFile } from "../../utils/actions";

const STORAGE_KEY = "agri-feed-regional-intelligence-v2";

const DISTRICT_META = [
  {
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    lat: -1.9983,
    lng: 30.1038,
    accessibility: "High",
    weatherRiskBase: 74,
    marketActivityBase: 84,
  },
  {
    district: "Bugesera District",
    sector: "Nyamata Sector",
    lat: -2.1461,
    lng: 30.1075,
    accessibility: "Medium",
    weatherRiskBase: 66,
    marketActivityBase: 76,
  },
  {
    district: "Musanze District",
    sector: "Muhoza Sector",
    lat: -1.4996,
    lng: 29.6344,
    accessibility: "Medium",
    weatherRiskBase: 71,
    marketActivityBase: 69,
  },
  {
    district: "Rwamagana District",
    sector: "Kigabiro Sector",
    lat: -1.9495,
    lng: 30.4347,
    accessibility: "High",
    weatherRiskBase: 54,
    marketActivityBase: 73,
  },
  {
    district: "Huye District",
    sector: "Ngoma Sector",
    lat: -2.5965,
    lng: 29.7396,
    accessibility: "Medium",
    weatherRiskBase: 58,
    marketActivityBase: 64,
  },
  {
    district: "Rubavu District",
    sector: "Gisenyi Sector",
    lat: -1.6805,
    lng: 29.2586,
    accessibility: "High",
    weatherRiskBase: 63,
    marketActivityBase: 78,
  },
];

const seededState = {
  iotDemoEnabled: false,
  advisories: [
    {
      id: "adv-1",
      title: "Prioritize aphid scouting this week",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      category: "Pests & Diseases",
      severity: "High",
      channel: "In-App",
      targetFarmers: 42,
      recommendedAction: "Inspect bean fields every 48 hours and escalate if colony density increases.",
      message:
        "Bean fields in Gatenga should be inspected every 2 days because humidity has been favorable for aphid buildup.",
      status: "Published",
      createdAt: "2026-06-17T08:30:00.000Z",
      createdBy: "Extension Officer",
    },
    {
      id: "adv-2",
      title: "Delay nitrogen top-dressing before rainfall window",
      district: "Bugesera District",
      sector: "Nyamata Sector",
      category: "Irrigation",
      severity: "Medium",
      channel: "SMS",
      targetFarmers: 31,
      recommendedAction: "Hold nitrogen application until moderate rainfall is confirmed within 48 hours.",
      message:
        "Nitrogen application should be delayed until moderate rainfall is confirmed to reduce volatilization losses.",
      status: "Sent",
      createdAt: "2026-06-16T10:10:00.000Z",
      createdBy: "District Agronomist",
    },
  ],
  outbreaks: [
    {
      id: "out-1",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      crop: "Beans",
      pest: "Bean Aphid",
      intensity: "High",
      trend: "Increasing",
      riskScore: 78,
      lat: -1.9981,
      lng: 30.1046,
      affectedFarms: 8,
      updatedAt: "2026-06-17T09:00:00.000Z",
    },
    {
      id: "out-2",
      district: "Bugesera District",
      sector: "Nyamata Sector",
      crop: "Maize",
      pest: "Fall Armyworm",
      intensity: "Moderate",
      trend: "Stable",
      riskScore: 61,
      lat: -2.1504,
      lng: 30.1039,
      affectedFarms: 5,
      updatedAt: "2026-06-16T15:20:00.000Z",
    },
    {
      id: "out-3",
      district: "Musanze District",
      sector: "Muhoza Sector",
      crop: "Irish Potato",
      pest: "Late Blight",
      intensity: "High",
      trend: "Increasing",
      riskScore: 81,
      lat: -1.5001,
      lng: 29.6341,
      affectedFarms: 11,
      updatedAt: "2026-06-17T06:40:00.000Z",
    },
    {
      id: "out-4",
      district: "Rwamagana District",
      sector: "Kigabiro Sector",
      crop: "Maize",
      pest: "Maize Streak Virus",
      intensity: "Low",
      trend: "Decreasing",
      riskScore: 39,
      lat: -1.9495,
      lng: 30.4347,
      affectedFarms: 3,
      updatedAt: "2026-06-15T11:00:00.000Z",
    },
    {
      id: "out-5",
      district: "Huye District",
      sector: "Ngoma Sector",
      crop: "Beans",
      pest: "Angular Leaf Spot",
      intensity: "Moderate",
      trend: "Stable",
      riskScore: 57,
      lat: -2.5965,
      lng: 29.7396,
      affectedFarms: 4,
      updatedAt: "2026-06-16T13:35:00.000Z",
    },
    {
      id: "out-6",
      district: "Rubavu District",
      sector: "Gisenyi Sector",
      crop: "Irish Potato",
      pest: "Potato Tuber Moth",
      intensity: "Moderate",
      trend: "Increasing",
      riskScore: 64,
      lat: -1.6805,
      lng: 29.2586,
      affectedFarms: 6,
      updatedAt: "2026-06-17T07:10:00.000Z",
    },
  ],
  marketAlerts: [
    {
      id: "market-1",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      crop: "Beans",
      market: "Zinia Market",
      trend: "Rising",
      demand: "High",
      priceRwfKg: 1020,
      note: "Urban retail demand has improved for clean beans lots.",
      lat: -1.9992,
      lng: 30.1031,
      updatedAt: "2026-06-17T12:20:00.000Z",
    },
    {
      id: "market-2",
      district: "Kicukiro District",
      sector: "Kanserege Sector",
      crop: "Beans",
      market: "Kanserege Market",
      trend: "Stable",
      demand: "Medium",
      priceRwfKg: 960,
      note: "Buyer activity is steady but margins remain thinner than Zinia.",
      lat: -1.9926,
      lng: 30.1062,
      updatedAt: "2026-06-17T12:20:00.000Z",
    },
    {
      id: "market-3",
      district: "Kicukiro District",
      sector: "Kicukiro Sector",
      crop: "Beans",
      market: "Kicukiro Modern Market",
      trend: "Rising",
      demand: "High",
      priceRwfKg: 1080,
      note: "Institutional buyers are offering stronger prices for sorted beans.",
      lat: -1.9705,
      lng: 30.1088,
      updatedAt: "2026-06-17T12:20:00.000Z",
    },
    {
      id: "market-4",
      district: "Bugesera District",
      sector: "Nyamata Sector",
      crop: "Maize",
      market: "Nyamata Market",
      trend: "Rising",
      demand: "High",
      priceRwfKg: 720,
      note: "Cross-district grain buyers are active this week.",
      lat: -2.1458,
      lng: 30.1049,
      updatedAt: "2026-06-17T11:10:00.000Z",
    },
    {
      id: "market-5",
      district: "Musanze District",
      sector: "Muhoza Sector",
      crop: "Irish Potato",
      market: "Musanze Main Market",
      trend: "Stable",
      demand: "High",
      priceRwfKg: 560,
      note: "Potato movement remains fast but quality grading matters.",
      lat: -1.4996,
      lng: 29.6344,
      updatedAt: "2026-06-17T09:40:00.000Z",
    },
    {
      id: "market-6",
      district: "Rubavu District",
      sector: "Gisenyi Sector",
      crop: "Irish Potato",
      market: "Rubavu Cross-Border Market",
      trend: "Rising",
      demand: "High",
      priceRwfKg: 610,
      note: "Cross-border demand is strengthening margins for graded potato lots.",
      lat: -1.6849,
      lng: 29.2604,
      updatedAt: "2026-06-17T10:50:00.000Z",
    },
  ],
  communityReports: [
    {
      id: "report-1",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      title: "Aphids seen on beans near marsh edge",
      body: "Three neighboring plots observed clustering aphids on bean leaves after humid mornings.",
      author: "Farmer Dative",
      category: "Pests & Diseases",
      severity: "High",
      createdAt: "2026-06-17T07:45:00.000Z",
      status: "Validated",
    },
    {
      id: "report-2",
      district: "Bugesera District",
      sector: "Nyamata Sector",
      title: "Dry winds affecting newly emerged maize",
      body: "Farmers in Nyamata reported uneven establishment where ridge moisture dropped quickly.",
      author: "Cooperative Lead",
      category: "Weather",
      severity: "Medium",
      createdAt: "2026-06-16T16:00:00.000Z",
      status: "Reviewing",
    },
    {
      id: "report-3",
      district: "Musanze District",
      sector: "Muhoza Sector",
      title: "Late blight spots confirmed in potato plots",
      body: "Extension volunteers confirmed leaf lesions after two damp nights in potato fields.",
      author: "Extension Scout",
      category: "Pests & Diseases",
      severity: "High",
      createdAt: "2026-06-17T09:15:00.000Z",
      status: "Validated",
    },
  ],
};

function normalizeSavedState(saved = {}) {
  return {
    ...seededState,
    ...saved,
    advisories: Array.isArray(saved.advisories) ? saved.advisories : seededState.advisories,
    outbreaks: Array.isArray(saved.outbreaks) ? saved.outbreaks : seededState.outbreaks,
    marketAlerts: Array.isArray(saved.marketAlerts) ? saved.marketAlerts : seededState.marketAlerts,
    communityReports: Array.isArray(saved.communityReports) ? saved.communityReports : seededState.communityReports,
  };
}

function loadRegionalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return normalizeSavedState(saved || {});
  } catch {
    return normalizeSavedState();
  }
}

function saveRegionalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDistrict(region = "") {
  const match = region.match(/([^,]+District)/i);
  return match ? match[1].trim() : region.split(",")[0]?.trim() || "Kicukiro District";
}

function getSector(region = "") {
  const match = region.match(/([^,]+Sector)/i);
  return match ? match[1].trim() : region.split(",")[0]?.trim() || "Gatenga Sector";
}

function formatReadableDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "18 Jun 2026";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toRelativeTime(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function scoreToSeverity(score) {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function severityTone(severity = "") {
  const lower = severity.toLowerCase();
  if (lower === "critical") return "tone-red";
  if (lower === "high") return "tone-orange";
  if (lower === "medium" || lower === "moderate") return "tone-amber";
  if (lower === "draft") return "tone-amber";
  return "tone-green";
}

function statusTone(status = "") {
  const lower = status.toLowerCase();
  if (lower.includes("confirmed") || lower.includes("validated")) return "tone-green";
  if (lower.includes("sent") || lower.includes("published")) return "tone-blue";
  if (lower.includes("draft") || lower.includes("review")) return "tone-amber";
  return "tone-red";
}

function buildWeatherAlerts(weather, district, sector) {
  if (!weather?.daily) {
    return [
      {
        id: "weather-demo",
        district,
        sector,
        title: "Weather warning unavailable",
        message: "Live weather could not be loaded, so demo monitoring guidance should be used.",
        severity: "Medium",
        type: "Weather",
      },
    ];
  }

  const rain = Array.isArray(weather?.daily?.rain_sum) ? weather.daily.rain_sum : (Array.isArray(weather?.daily?.precipitation_sum) ? weather.daily.precipitation_sum : []);
  const maxTemp = Array.isArray(weather?.daily?.temperature_2m_max) ? weather.daily.temperature_2m_max : [];
  const wind = Array.isArray(weather?.daily?.wind_speed_10m_max) ? weather.daily.wind_speed_10m_max : [];
  const probability = Array.isArray(weather?.daily?.precipitation_probability_max) ? weather.daily.precipitation_probability_max : [];
  const alerts = [];

  if (rain.some((value) => Number(value || 0) >= 30)) {
    alerts.push({
      id: "weather-rain",
      district,
      sector,
      title: "Heavy rain warning",
      message: "Drainage and erosion checks are recommended because high daily rain totals are expected this week.",
      severity: "High",
      type: "Weather",
    });
  }
  if (maxTemp.some((value) => Number(value || 0) >= 32)) {
    alerts.push({
      id: "weather-heat",
      district,
      sector,
      title: "Heat stress risk",
      message: "Irrigation timing should shift to early morning or evening because high daytime temperature is expected.",
      severity: "Medium",
      type: "Weather",
    });
  }
  if (wind.some((value) => Number(value || 0) >= 35)) {
    alerts.push({
      id: "weather-wind",
      district,
      sector,
      title: "Strong wind alert",
      message: "Strong wind may increase evapotranspiration and crop stress on exposed fields.",
      severity: "Medium",
      type: "Weather",
    });
  }
  if (!alerts.length && probability.some((value) => Number(value || 0) >= 45)) {
    alerts.push({
      id: "weather-watch",
      district,
      sector,
      title: "Rain watch",
      message: "Timing-sensitive applications should be reviewed because moderate rainfall probability is expected.",
      severity: "Low",
      type: "Weather",
    });
  }

  return alerts;
}

function SourceBadges() {
  const hasBackend = isBackendSessionActive();
  return (
    <div className="regional-source-row">
      <span className="regional-source-badge live">Live Weather Data</span>
      <span className={`regional-source-badge ${hasBackend ? "live" : "demo"}`}>{hasBackend ? "Market Data" : "Demo Market Data"}</span>
      <span className="regional-source-badge local">Soil Data</span>
      <span className={`regional-source-badge ${hasBackend ? "live" : "demo"}`}>{hasBackend ? "Pest Data" : "Demo Pest Data"}</span>
    </div>
  );
}

function FarmerRegionalAlerts({ state, setState }) {
  const { currentFarms } = useFarmerData();
  const [selectedFarmId, setSelectedFarmId] = useState(currentFarms[0]?.id || "");
  const [weatherState, setWeatherState] = useState({ loading: true, data: null });
  const [reportTitle, setReportTitle] = useState("");
  const [reportBody, setReportBody] = useState("");
  const farms = (Array.isArray(currentFarms) ? currentFarms : []).length ? currentFarms : [];

  useEffect(() => {
    if (selectedFarmId || !farms.length) return;
    setSelectedFarmId(farms[0].id);
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0] || null,
    [farms, selectedFarmId]
  );

  useEffect(() => {
    let cancelled = false;
    let safetyTimeoutId;

    async function loadWeather() {
      if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
        setWeatherState({ loading: false, data: null });
        return;
      }

      setWeatherState({ loading: true, data: null });

      safetyTimeoutId = setTimeout(() => {
        if (!cancelled) setWeatherState({ loading: false, data: null });
      }, 5000);

      try {
        const data = await apiClient.weather.forecast(selectedFarm.location.lat, selectedFarm.location.lng);
        if (!cancelled) {
          clearTimeout(safetyTimeoutId);
          setWeatherState({ loading: false, data });
        }
      } catch {
        if (!cancelled) {
          clearTimeout(safetyTimeoutId);
          setWeatherState({ loading: false, data: null });
        }
      }
    }

    loadWeather();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimeoutId);
    };
  }, [selectedFarm]);

  const district = getDistrict(selectedFarm?.region);
  const sector = getSector(selectedFarm?.region);
  const baseCoords = selectedFarm?.location || { lat: -1.9983, lng: 30.1038 };

  const nearbyOutbreaks = useMemo(
    () =>
      (Array.isArray(state.outbreaks) ? state.outbreaks : [])
        .map((item) => ({
          ...item,
          distanceKm: haversineKm(baseCoords.lat, baseCoords.lng, item.lat, item.lng),
        }))
        .filter((item) => item.district === district || item.distanceKm <= 35)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 4),
    [baseCoords.lat, baseCoords.lng, district, state.outbreaks]
  );

  const nearbyMarkets = useMemo(
    () =>
      (Array.isArray(state.marketAlerts) ? state.marketAlerts : [])
        .map((item) => ({
          ...item,
          distanceKm: haversineKm(baseCoords.lat, baseCoords.lng, item.lat, item.lng),
        }))
        .filter((item) => item.district === district || item.distanceKm <= 40)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 4),
    [baseCoords.lat, baseCoords.lng, district, state.marketAlerts]
  );

  const districtAdvisories = useMemo(
    () =>
      (Array.isArray(state.advisories) ? state.advisories : [])
        .filter((item) => item.district === district)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4),
    [district, state.advisories]
  );

  const communityReports = useMemo(
    () =>
      (Array.isArray(state.communityReports) ? state.communityReports : [])
        .filter((item) => item.district === district)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [district, state.communityReports]
  );

  const weatherAlerts = useMemo(
    () => buildWeatherAlerts(weatherState.data, district, sector),
    [district, sector, weatherState.data]
  );

  const allActivity = useMemo(
    () =>
      [
        ...nearbyOutbreaks.map((item) => ({
          id: item.id,
          type: "Pest",
          severity: item.intensity,
          title: `${item.pest} risk in ${item.sector}`,
          description: `${item.crop} growers nearby are seeing a ${item.trend.toLowerCase()} trend.`,
          timestamp: item.updatedAt,
        })),
        ...weatherAlerts.map((item) => ({
          id: item.id,
          type: "Weather",
          severity: item.severity,
          title: item.title,
          description: item.message,
          timestamp: new Date().toISOString(),
        })),
        ...nearbyMarkets.map((item) => ({
          id: item.id,
          type: "Market",
          severity: item.trend === "Rising" ? "High" : "Medium",
          title: `${item.market} market update`,
          description: `${item.crop} is ${item.trend.toLowerCase()} with ${item.demand.toLowerCase()} demand.`,
          timestamp: item.updatedAt,
        })),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [nearbyMarkets, nearbyOutbreaks, weatherAlerts]
  );

  const submitCommunityReport = () => {
    const title = reportTitle.trim();
    const body = reportBody.trim();
    if (!selectedFarm || !title || !body) return;

    setState((current) => ({
      ...current,
      communityReports: [
        {
          id: `report-${Date.now()}`,
          district,
          sector,
          title,
          body,
          author: "Rodrigue Farmer",
          category: "Community",
          severity: "Medium",
          createdAt: new Date().toISOString(),
          status: "Community reported",
        },
        ...current.communityReports,
      ],
    }));
    setReportTitle("");
    setReportBody("");
  };

  return (
    <section className="management-page">
      <div className="page-title-block">
        <h1>Community &amp; Regional Alerts</h1>
        <p>
          Regional decision support for the selected farm using nearby weather warnings, pest signals, market intelligence,
          extension officer advice, and community reports.
        </p>
      </div>

      <SourceBadges />

      <div className="management-toolbar">
        <div className="toolbar-search">
          <Search size={15} />
          <input type="text" placeholder="Search alerts, markets, advisories, or reports..." readOnly />
        </div>
        <label className="regional-farm-selector">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} · {farm.region}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="management-summary-grid">
        <article className="mini-summary-card">
          <div className="stat-icon tone-blue"><MapPin size={16} /></div>
          <div><span>My District</span><strong>{district}</strong></div>
        </article>
        <article className="mini-summary-card">
          <div className="stat-icon tone-amber"><ShieldAlert size={16} /></div>
          <div><span>Nearby Pest Alerts</span><strong>{nearbyOutbreaks.length}</strong></div>
        </article>
        <article className="mini-summary-card">
          <div className="stat-icon tone-blue"><CloudRain size={16} /></div>
          <div><span>Weather Warnings</span><strong>{weatherAlerts.length}</strong></div>
        </article>
        <article className="mini-summary-card">
          <div className="stat-icon tone-green"><Store size={16} /></div>
          <div><span>Nearby Markets</span><strong>{nearbyMarkets.length}</strong></div>
        </article>
      </div>

      <div className="management-grid regional-grid">
        <article className="prototype-panel regional-farmer-panel">
          <div className="panel-toolbar">
            <h2>Alerts Near My Farm</h2>
            <span className="regional-inline-tag">{sector}</span>
          </div>
          {allActivity.length ? (
            <div className="regional-feed-list">
              {allActivity.slice(0, 6).map((item) => (
                <div key={item.id} className="regional-feed-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <div>
                    <span className={`status-pill ${severityTone(item.severity)}`}>{item.type}</span>
                    <small>{toRelativeTime(item.timestamp)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="irrigation-empty-copy">No nearby alerts available for this district yet.</div>
          )}
        </article>

        <aside className="prototype-panel regional-farmer-side">
          <div className="panel-toolbar">
            <h2>Extension Officer Advice</h2>
            <BellRing size={16} color="#1ea4ff" />
          </div>
          <div className="editorial-stack">
            {districtAdvisories.length ? districtAdvisories.map((item) => (
              <div key={item.id} className="editorial-item regional-advisory-item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </div>
                <small>{item.severity} · {toRelativeTime(item.createdAt)}</small>
              </div>
            )) : <div className="irrigation-empty-copy">No district advisory has been published yet.</div>}
          </div>
        </aside>
      </div>

      <div className="management-grid regional-grid">
        <article className="prototype-panel regional-market-panel">
          <div className="panel-toolbar">
            <h2>Nearby Market Trends</h2>
            <span className={`regional-inline-tag ${isBackendSessionActive() ? "live" : "demo"}`}>{isBackendSessionActive() ? "Market Data" : "Demo Market Data"}</span>
          </div>
          <div className="signup-table management-table">
            <div className="signup-row signup-head regional-head regional-table-five">
              <span>Market</span>
              <span>Distance</span>
              <span>Crop</span>
              <span>Trend</span>
              <span>Price</span>
            </div>
            {nearbyMarkets.map((item) => (
              <div key={item.id} className="signup-row regional-body-row regional-table-five">
                <strong>{item.market}</strong>
                <span>{item.distanceKm.toFixed(1)} km</span>
                <span>{item.crop}</span>
                <span className={`status-pill ${item.trend === "Rising" ? "tone-green" : "tone-amber"}`}>{item.trend}</span>
                <span>{new Intl.NumberFormat("en-RW").format(item.priceRwfKg)} RWF/kg</span>
              </div>
            ))}
          </div>
        </article>

        <article className="prototype-panel regional-report-panel">
          <div className="panel-toolbar">
            <h2>Community Reports Near {district}</h2>
            <MessageSquareText size={16} color="#1ea4ff" />
          </div>
          <div className="regional-report-form">
            <input
              type="text"
              placeholder="Report title"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
            />
            <textarea
              rows="4"
              placeholder="Share a field observation from your district..."
              value={reportBody}
              onChange={(event) => setReportBody(event.target.value)}
            />
            <button type="button" className="toolbar-button primary" onClick={submitCommunityReport}>
              <Send size={15} />
              <span>Submit Local Report</span>
            </button>
          </div>
          <div className="editorial-stack">
            {communityReports.map((item) => (
              <div key={item.id} className="editorial-item regional-advisory-item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
                <small>{item.author} · {toRelativeTime(item.createdAt)}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      {weatherState.loading ? <div className="irrigation-state-banner">Loading live weather context for regional alerts...</div> : null}
    </section>
  );
}

function AdminRegionalDashboard({ state, setState, backendAdminMode, backendPayload, applyBackendDashboard, isLoading }) {
  const { adminFarmerRows = [], data = {} } = useFarmerData();
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICT_META[0].district);
  const [selectedSector, setSelectedSector] = useState(DISTRICT_META[0].sector);
  const [advisoryTitle, setAdvisoryTitle] = useState("");
  const [category, setCategory] = useState("Pests & Diseases");
  const [severity, setSeverity] = useState("High");
  const [deliveryChannel, setDeliveryChannel] = useState("In-App");
  const [advisoryMessage, setAdvisoryMessage] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const districtOptions = DISTRICT_META.map((item) => item.district);

  const allFarms = Array.isArray(data.farms) ? data.farms : [];

  const districtProfiles = useMemo(() => {
    if (Array.isArray(backendPayload?.districtProfiles) && backendPayload.districtProfiles.length) {
      return backendPayload.districtProfiles;
    }

    return DISTRICT_META.map((meta) => {
      const outbreaks = state.outbreaks.filter((item) => item.district === meta.district);
      const markets = state.marketAlerts.filter((item) => item.district === meta.district);
      const reports = state.communityReports.filter((item) => item.district === meta.district);
      const advisories = state.advisories.filter((item) => item.district === meta.district);
      const farms = allFarms.filter((farm) => (farm.region || "").includes(meta.district));
      const farmers = adminFarmerRows.filter((row) => (row.region || "").includes(meta.district));
      const pestRisk = outbreaks.length
        ? Math.round(outbreaks.reduce((sum, item) => sum + item.riskScore, 0) / outbreaks.length)
        : 32;
      const weatherRisk = Math.min(96, Math.round(meta.weatherRiskBase + reports.filter((item) => item.category === "Weather").length * 4));
      const marketActivity = Math.min(
        96,
        Math.round(
          meta.marketActivityBase +
            markets.filter((item) => item.trend === "Rising").length * 4 +
            markets.filter((item) => item.demand === "High").length * 2
        )
      );
      const farmerActivity = Math.min(95, reports.length * 10 + advisories.length * 8 + farms.length * 6 + farmers.length * 5);
      const overallRiskScore = Math.round((weatherRisk * 0.28) + (pestRisk * 0.34) + (marketActivity * 0.16) + (farmerActivity * 0.22));
      const verificationRate = farmers.length
        ? Math.round((farmers.filter((row) => row.status === "verified").length / farmers.length) * 100)
        : 72;

      return {
        ...meta,
        outbreaks,
        markets,
        reports,
        advisories,
        farmsCount: farms.length,
        farmersCount: farmers.length,
        pestRisk,
        weatherRisk,
        marketActivity,
        farmerActivity,
        overallRiskScore,
        verificationRate,
      };
    });
  }, [adminFarmerRows, allFarms, backendPayload?.districtProfiles, state.advisories, state.communityReports, state.marketAlerts, state.outbreaks]);

  const selectedProfile = useMemo(
    () => districtProfiles.find((item) => item.district === selectedDistrict) || districtProfiles[0],
    [districtProfiles, selectedDistrict]
  );

  useEffect(() => {
    if (selectedProfile?.sector) {
      setSelectedSector(selectedProfile.sector);
    }
  }, [selectedProfile]);

  const monitoringRows = useMemo(() => {
    const backendRows = backendPayload?.monitoringRowsByDistrict?.[selectedDistrict];
    if (Array.isArray(backendRows) && backendRows.length) {
      return backendRows;
    }

    const sectorMap = new Map();

    selectedProfile?.outbreaks?.forEach((item) => {
      const current = sectorMap.get(item.sector) || {
        sector: item.sector,
        weatherRiskScore: selectedProfile.weatherRisk,
        pestRiskScore: 0,
        marketSignal: "Monitor",
        farmerReports: 0,
        affectedFarms: 0,
        trend: item.trend,
      };
      current.pestRiskScore = Math.max(current.pestRiskScore, item.riskScore);
      current.affectedFarms += item.affectedFarms;
      current.trend = item.trend;
      sectorMap.set(item.sector, current);
    });

    selectedProfile?.reports?.forEach((item) => {
      const current = sectorMap.get(item.sector) || {
        sector: item.sector,
        weatherRiskScore: selectedProfile.weatherRisk,
        pestRiskScore: selectedProfile.pestRisk,
        marketSignal: "Monitor",
        farmerReports: 0,
        affectedFarms: 0,
        trend: "Stable",
      };
      current.farmerReports += 1;
      sectorMap.set(item.sector, current);
    });

    selectedProfile?.markets?.forEach((item) => {
      const current = sectorMap.get(item.sector) || {
        sector: item.sector,
        weatherRiskScore: selectedProfile.weatherRisk,
        pestRiskScore: selectedProfile.pestRisk,
        marketSignal: "Monitor",
        farmerReports: 0,
        affectedFarms: 0,
        trend: "Stable",
      };
      current.marketSignal = item.trend === "Rising" ? "Opportunity" : item.demand === "High" ? "Stable Demand" : "Monitor";
      sectorMap.set(item.sector, current);
    });

    return Array.from(sectorMap.values()).map((item) => ({
      ...item,
      weatherRisk: scoreToSeverity(item.weatherRiskScore),
      pestIntensity: scoreToSeverity(item.pestRiskScore),
    }));
  }, [backendPayload?.monitoringRowsByDistrict, selectedDistrict, selectedProfile]);

  const insightMessage = useMemo(() => {
    if (backendPayload?.summaryInsight && selectedDistrict === districtProfiles[0]?.district) return backendPayload.summaryInsight;
    if (!selectedProfile) return "";
    const highestDriver = [
      { label: "weather risk", value: selectedProfile.weatherRisk },
      { label: "pest outbreak intensity", value: selectedProfile.pestRisk },
      { label: "farmer reports", value: selectedProfile.farmerActivity },
      { label: "market movement", value: selectedProfile.marketActivity },
    ].sort((a, b) => b.value - a.value)[0];

    return `${selectedProfile.district} requires close monitoring because ${highestDriver.label} is elevated and extension coordination is needed across ${selectedProfile.farmsCount || 0} farm records.`;
  }, [selectedProfile]);

  const publishAdvisory = async () => {
    const title = advisoryTitle.trim();
    const message = advisoryMessage.trim();
    const action = recommendedAction.trim();
    if (!title || !message || !action) return;

    const targetFarmers = Math.max(12, (selectedProfile?.farmersCount || 0) * 6);

    if (backendAdminMode) {
      try {
        const result = await phase1BackendService.admin.issueRegionalAdvisory({
          title,
          district: selectedDistrict,
          sector: selectedSector,
          category,
          severity,
          deliveryChannel,
          message,
          recommendedAction: action,
          targetFarmers,
        });

        if (result?.dashboard) {
          applyBackendDashboard(result.dashboard);
        }

        setStatusMessage(`Regional advisory published for ${selectedDistrict}.`);
        setAdvisoryTitle("");
        setAdvisoryMessage("");
        setRecommendedAction("");
        return;
      } catch {
        // Fall back to local/demo state if backend advisory publishing is unavailable.
      }
    }

    setState((current) => ({
      ...current,
      advisories: [
        {
          id: `adv-${Date.now()}`,
          title,
          district: selectedDistrict,
          sector: selectedSector,
          category,
          severity,
          channel: deliveryChannel,
          targetFarmers,
          recommendedAction: action,
          message,
          status: deliveryChannel === "In-App" ? "Published" : "Sent",
          createdAt: new Date().toISOString(),
          createdBy: "Regional Monitoring Dashboard",
        },
        ...current.advisories,
      ],
    }));
    setStatusMessage(`Regional advisory published for ${selectedDistrict}.`);
    setAdvisoryTitle("");
    setAdvisoryMessage("");
    setRecommendedAction("");
  };

  const exportSectorReport = (row) => {
    downloadJsonFile(`${row.sector.toLowerCase().replace(/\s+/g, "-")}-sector-report.json`, {
      district: selectedDistrict,
      sector: row.sector,
      weatherRisk: row.weatherRisk,
      pestOutbreakIntensity: row.pestIntensity,
      marketSignal: row.marketSignal,
      farmerReports: row.farmerReports,
      affectedFarms: row.affectedFarms,
      trend: row.trend,
      dataMode: DEMO_MODE ? "Demo + Local Data" : "Live",
    });
  };

  const exportAdvisoryHistory = () => {
    downloadCsvFile(
      "regional-advisory-history.csv",
      [
        ["Title", "District", "Sector", "Target Farmers", "Date", "Status", "Channel"],
        ...state.advisories.map((item) => [
          item.title,
          item.district,
          item.sector,
          item.targetFarmers,
          formatReadableDate(item.createdAt),
          item.status,
          item.channel,
        ]),
      ]
    );
  };

  const exportCommunityReports = () => {
    downloadTextFile(
      "regional-community-reports.txt",
      state.communityReports
        .map(
          (item) =>
            `${item.title}\n${item.author} | ${item.district}, ${item.sector}\n${item.category} | ${item.severity} | ${formatReadableDate(item.createdAt)}\n${item.body}\n`
        )
        .join("\n")
    );
  };
  return (
    <section className="rm-page">
      <div className="rm-header">
        <div className="rm-header-row">
          <div>
            <h1>Regional Monitoring Dashboard</h1>
            <p>Extension officer command center for district monitoring, outbreak escalation, advisory publishing, market movement, and community field intelligence.</p>
          </div>
          <span className="rm-inline-tag">{backendAdminMode ? "Backend + Demo Fallback" : "Demo + Local Data"}</span>
        </div>
      </div>

      <SourceBadges />

      {statusMessage ? <div className="rm-notice">{statusMessage}</div> : null}

      {isLoading ? <div className="rm-loading">Loading backend regional monitoring data...</div> : null}

      <div className="rm-toolbar">
        <label className="rm-search">
          <Search size={16} />
          <input type="text" placeholder="Search district, alert, outbreak, or advisory..." readOnly />
        </label>
        <label className="rm-district-select">
          <span>Monitored district</span>
          <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="rm-summary-grid">
        <article className="rm-summary-card">
          <div className="rm-summary-icon blue"><MapIcon size={18} /></div>
          <div className="rm-summary-info">
            <span>Monitored Districts</span>
            <strong>{DISTRICT_META.length}</strong>
          </div>
        </article>
        <article className="rm-summary-card">
          <div className="rm-summary-icon red"><TriangleAlert size={18} /></div>
          <div className="rm-summary-info">
            <span>Active Regional Alerts</span>
            <strong>{(selectedProfile?.outbreaks?.length || 0) + (selectedProfile?.reports?.length || 0)}</strong>
          </div>
        </article>
        <article className="rm-summary-card">
          <div className="rm-summary-icon green"><Store size={18} /></div>
          <div className="rm-summary-info">
            <span>Market Activity</span>
            <strong>{scoreToSeverity(selectedProfile?.marketActivity || 0)}</strong>
          </div>
        </article>
        <article className="rm-summary-card">
          <div className="rm-summary-icon blue"><Users size={18} /></div>
          <div className="rm-summary-info">
            <span>Farmer Activity</span>
            <strong>{selectedProfile?.farmerActivity || 0}</strong>
          </div>
        </article>
        <article className="rm-summary-card">
          <div className="rm-summary-icon amber"><ShieldAlert size={18} /></div>
          <div className="rm-summary-info">
            <span>Verification Rate</span>
            <strong>{selectedProfile?.verificationRate || 0}%</strong>
          </div>
        </article>
        {state.iotDemoEnabled ? (
          <article className="rm-summary-card">
            <div className="rm-summary-icon green"><RadioTower size={18} /></div>
            <div className="rm-summary-info">
              <span>Sensor Health</span>
              <strong>91%</strong>
            </div>
          </article>
        ) : null}
      </div>

      <div className="rm-main-grid">
        <article className="rm-card">
          <div className="rm-card-header">
            <h2>Regional Risk Heatmap</h2>
            <button type="button" className="fm-btn ghost" style={{ fontSize: 12, color: 'var(--primary-green)', fontWeight: 600 }} onClick={() => setState((current) => ({ ...current, iotDemoEnabled: !current.iotDemoEnabled }))}>
              {state.iotDemoEnabled ? "Hide Sensor Demo" : "Enable IoT Demo"}
            </button>
          </div>
          <div className="rm-heatmap-grid">
            {districtProfiles.map((profile) => (
              <button
                key={profile.district}
                type="button"
                className={`rm-heatmap-card ${profile.district === selectedDistrict ? "active" : ""}`}
                onClick={() => setSelectedDistrict(profile.district)}
              >
                <div className="rm-heatmap-top">
                  <strong>{profile.district}</strong>
                  <span className={`rm-severity-pill ${severityTone(scoreToSeverity(profile.overallRiskScore))}`}>
                    {scoreToSeverity(profile.overallRiskScore)}
                  </span>
                </div>
                <div className="rm-heatmap-meta">
                  <span>{profile.sector}</span>
                  <small>{profile.farmersCount} farmers · {profile.farmsCount} farms</small>
                </div>
                <div className="rm-heatmap-bars">
                  <div><span>Weather</span><strong className={`rm-severity-pill ${severityTone(scoreToSeverity(profile.weatherRisk))}`} style={{ fontSize: 11, padding: '1px 6px' }}>{scoreToSeverity(profile.weatherRisk)}</strong></div>
                  <div><span>Pests</span><strong className={`rm-severity-pill ${severityTone(scoreToSeverity(profile.pestRisk))}`} style={{ fontSize: 11, padding: '1px 6px' }}>{scoreToSeverity(profile.pestRisk)}</strong></div>
                  <div><span>Market</span><strong className={`rm-severity-pill ${severityTone(scoreToSeverity(profile.marketActivity))}`} style={{ fontSize: 11, padding: '1px 6px' }}>{scoreToSeverity(profile.marketActivity)}</strong></div>
                  <div><span>Farmer Activity</span><strong style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark-green)' }}>{profile.farmerActivity}</strong></div>
                </div>
                <div className="rm-heatmap-score">
                  <span>Overall Risk Score</span>
                  <strong>{profile.overallRiskScore}/100</strong>
                </div>
              </button>
            ))}
          </div>
        </article>

        <aside className="rm-card">
          <div className="rm-card-header">
            <h2>Regional Summary Insight</h2>
            <Activity size={16} color="var(--primary-green)" />
          </div>
          <p className="rm-insight-copy">{insightMessage}</p>
          <div className="rm-insight-list">
            <div className="rm-insight-item">
              <div className="rm-insight-item-left">
                <strong>{selectedProfile?.district}</strong>
                <small>Current focus area</small>
              </div>
              <span className={`rm-severity-pill ${severityTone(scoreToSeverity(selectedProfile?.overallRiskScore || 0))}`}>
                {scoreToSeverity(selectedProfile?.overallRiskScore || 0)}
              </span>
            </div>
            <div className="rm-insight-item">
              <div className="rm-insight-item-left">
                <strong>Accessibility</strong>
                <small>Last-mile delivery context</small>
              </div>
              <span>{selectedProfile?.accessibility}</span>
            </div>
            <div className="rm-insight-item">
              <div className="rm-insight-item-left">
                <strong>Extension advisory pressure</strong>
                <small>Regional advisory workload</small>
              </div>
              <span>{(selectedProfile?.advisories?.length || 0)} live</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="rm-main-grid">
        <article className="rm-card">
          <div className="rm-card-header">
            <h2>District Monitoring Board</h2>
            <span className="rm-inline-tag">{selectedDistrict}</span>
          </div>
          <div className="rm-table-wrap">
            <div className="rm-table">
              <div className="rm-table-head">
                <span>Sector</span>
                <span>Weather Risk</span>
                <span>Pest Outbreak</span>
                <span>Market Signal</span>
                <span>Farmer Reports</span>
                <span>Affected Farms</span>
                <span>Trend</span>
                <span>Action</span>
              </div>
              {monitoringRows.map((row) => (
                <div key={row.sector} className="rm-table-row">
                  <strong>{row.sector}</strong>
                  <span className={`rm-severity-pill ${severityTone(row.weatherRisk)}`}>{row.weatherRisk}</span>
                  <span className={`rm-severity-pill ${severityTone(row.pestIntensity)}`}>{row.pestIntensity}</span>
                  <span>{row.marketSignal}</span>
                  <span>{row.farmerReports}</span>
                  <span>{row.affectedFarms}</span>
                  <span>{row.trend}</span>
                  <div className="rm-action-cell">
                    <button type="button" className="rm-action-btn blue" onClick={() => setSelectedSector(row.sector)}>View Details</button>
                    <button type="button" className="rm-action-btn green" onClick={() => { setSelectedSector(row.sector); setStatusMessage(`Advisory composer targeted ${row.sector}.`); }}>Issue Advisory</button>
                    <button type="button" className="rm-action-btn orange" onClick={() => exportSectorReport(row)}>Export Report</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="rm-card">
          <div className="rm-card-header">
            <h2>Issue Regional Advisory</h2>
            <Send size={16} color="var(--primary-green)" />
          </div>
          <div className="rm-card-body" style={{ padding: '16px 20px' }}>
            <div className="rm-form">
              <div className="rm-form-field">
                <label>Advisory Title</label>
                <input type="text" value={advisoryTitle} onChange={(event) => setAdvisoryTitle(event.target.value)} placeholder="Example: Escalate field scouting in Gatenga" />
              </div>
              <div className="rm-form-row">
                <div className="rm-form-field">
                  <label>District</label>
                  <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
                    {districtOptions.map((district) => <option key={district}>{district}</option>)}
                  </select>
                </div>
                <div className="rm-form-field">
                  <label>Sector</label>
                  <input type="text" value={selectedSector} onChange={(event) => setSelectedSector(event.target.value)} />
                </div>
              </div>
              <div className="rm-form-row three">
                <div className="rm-form-field">
                  <label>Alert Category</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option>Weather</option>
                    <option>Pests & Diseases</option>
                    <option>Market</option>
                    <option>Irrigation</option>
                    <option>Community</option>
                  </select>
                </div>
                <div className="rm-form-field">
                  <label>Severity</label>
                  <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div className="rm-form-field">
                  <label>Delivery Channel</label>
                  <select value={deliveryChannel} onChange={(event) => setDeliveryChannel(event.target.value)}>
                    <option>In-App</option>
                    <option>SMS</option>
                    <option>Email</option>
                  </select>
                </div>
              </div>
              <div className="rm-form-field">
                <label>Advisory Message</label>
                <textarea rows="3" value={advisoryMessage} onChange={(event) => setAdvisoryMessage(event.target.value)} placeholder="Describe the regional issue and the advisory context..." />
              </div>
              <div className="rm-form-field">
                <label>Recommended Farmer Action</label>
                <textarea rows="2" value={recommendedAction} onChange={(event) => setRecommendedAction(event.target.value)} placeholder="What exactly should farmers do next?" />
              </div>
              <button type="button" className="rm-submit-btn" onClick={publishAdvisory}>
                <Send size={15} />
                <span>Issue Regional Advisory</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="rm-main-grid">
        <article className="rm-card">
          <div className="rm-card-header">
            <h2>Advisory History</h2>
            <button type="button" className="fm-btn ghost" style={{ color: 'var(--primary-green)', fontWeight: 600 }} onClick={exportAdvisoryHistory}>
              <Download size={15} />
              Export History
            </button>
          </div>
          <div className="rm-table-wrap">
            <div className="rm-history-table">
              <div className="rm-history-head">
                <span>Title</span>
                <span>District</span>
                <span>Target Farmers</span>
                <span>Date</span>
                <span>Status</span>
                <span>Channel</span>
              </div>
              {state.advisories.slice(0, 8).map((item) => (
                <div key={item.id} className="rm-history-row">
                  <strong>{item.title}</strong>
                  <span>{item.district}</span>
                  <span>{item.targetFarmers}</span>
                  <span>{formatReadableDate(item.createdAt)}</span>
                  <span className={`rm-severity-pill ${statusTone(item.status)}`}>{item.status}</span>
                  <span>{item.channel}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="rm-card">
          <div className="rm-card-header">
            <h2>Regional Command Tools</h2>
            <BellRing size={16} color="var(--primary-green)" />
          </div>
          <div className="rm-command-list">
            <div className="rm-command-item">
              <Smartphone size={18} />
              <div>
                <strong>In-App broadcast ready</strong>
                <span>Use for quick district-level advisory confirmation.</span>
              </div>
            </div>
            <div className="rm-command-item">
              <MessageSquareText size={18} />
              <div>
                <strong>SMS channel available</strong>
                <span>Useful for urgent warnings to farmers with low-data access.</span>
              </div>
            </div>
            <div className="rm-command-item">
              <Mail size={18} />
              <div>
                <strong>Email summary prepared</strong>
                <span>Suitable for cooperatives, NGOs, and district reporting.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="rm-main-grid">
        <article className="rm-card">
          <div className="rm-card-header">
            <h2>Community Reports</h2>
            <button type="button" className="fm-btn ghost" style={{ color: 'var(--primary-green)', fontWeight: 600 }} onClick={exportCommunityReports}>
              <Download size={15} />
              Export Reports
            </button>
          </div>
          <div className="rm-table-wrap">
            <div className="rm-community-table">
              <div className="rm-community-head">
                <span>Report Title</span>
                <span>Farmer</span>
                <span>District / Sector</span>
                <span>Category</span>
                <span>Severity</span>
                <span>Date</span>
                <span>Status</span>
              </div>
              {state.communityReports.map((item) => (
                <div key={item.id} className="rm-community-row">
                  <strong>{item.title}</strong>
                  <span>{item.author}</span>
                  <span>{item.district} · {item.sector}</span>
                  <span>{item.category}</span>
                  <span className={`rm-severity-pill ${severityTone(item.severity)}`}>{item.severity}</span>
                  <span>{formatReadableDate(item.createdAt)}</span>
                  <span className={`rm-severity-pill ${statusTone(item.status)}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="rm-card">
          <div className="rm-card-header">
            <h2>Regional Data Labels</h2>
            <MapPin size={16} color="var(--primary-green)" />
          </div>
          <div className="rm-command-list">
            <div className="rm-command-item">
              <CloudRain size={18} />
              <div>
                <strong>Live Weather Data</strong>
                <span>Open-Meteo supports real weather context where available.</span>
              </div>
            </div>
            <div className="rm-command-item">
              <Sprout size={18} />
              <div>
                <strong>Demo + Local Advisory Data</strong>
                <span>Regional outbreak, market, and extension activity run from demo/local sources.</span>
              </div>
            </div>
            <div className="rm-command-item">
              <Store size={18} />
              <div>
                <strong>Academic Presentation Ready</strong>
                <span>All flows stay functional without backend APIs for demonstrations.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function RegionalMonitoringPage() {
  const { user } = useAuth();
  const [state, setState] = useState(() => loadRegionalState());

  useEffect(() => {
    saveRegionalState(state);
  }, [state]);

  const backendAdminMode = ["admin", "extensionofficer"].includes(user?.role) && isBackendSessionActive();
  const [adminBackendPayload, setAdminBackendPayload] = useState(null);
  const [adminBackendLoading, setAdminBackendLoading] = useState(false);

  const applyBackendDashboard = (payload) => {
    setAdminBackendPayload(payload);
    if (payload?.state) {
      setState(normalizeSavedState(payload.state));
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadAdminRegionalBackend() {
      if (!backendAdminMode) return;
      setAdminBackendLoading(true);
      try {
        const payload = await phase1BackendService.admin.regionalMonitoring();
        if (cancelled || !payload) return;
        applyBackendDashboard(payload);
      } catch {
        // Keep local/demo regional dashboard available if backend loading fails.
      } finally {
        if (!cancelled) setAdminBackendLoading(false);
      }
    }

    loadAdminRegionalBackend();
    return () => {
      cancelled = true;
    };
  }, [backendAdminMode]);

  if (["admin", "extensionofficer"].includes(user?.role)) {
    return (
      <AdminRegionalDashboard
        state={state}
        setState={setState}
        backendAdminMode={backendAdminMode}
        backendPayload={adminBackendPayload}
        applyBackendDashboard={applyBackendDashboard}
        isLoading={adminBackendLoading}
      />
    );
  }

  return <FarmerRegionalAlerts state={state} setState={setState} />;
}
