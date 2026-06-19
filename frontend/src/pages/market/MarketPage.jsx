import {
  Bell,
  Bot,
  ExternalLink,
  MapPinned,
  PackageCheck,
  Route,
  ShipWheel,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";

const MARKET_STORAGE_KEY = "agri-feed-market-module-v2";

const cropFilters = [
  "Wheat",
  "Corn",
  "Soybeans",
  "Rice",
  "Barley",
  "Beans",
  "Irish Potato",
  "Sweet Potato",
  "Cassava",
  "Sorghum",
  "Banana",
  "Plantain",
  "Groundnuts",
  "Peas",
  "Coffee",
  "Tea",
];

const CROP_MARKET_PROFILE = {
  Wheat: { current: 860, volatility: 0.08, growth30: 0.05, demand: 74, export: 980, wholesale: 790 },
  Corn: { current: 680, volatility: 0.06, growth30: 0.04, demand: 78, export: 760, wholesale: 620 },
  Soybeans: { current: 930, volatility: 0.07, growth30: 0.06, demand: 81, export: 1020, wholesale: 870 },
  Rice: { current: 1420, volatility: 0.05, growth30: 0.03, demand: 68, export: 1560, wholesale: 1320 },
  Barley: { current: 720, volatility: 0.05, growth30: 0.02, demand: 60, export: 790, wholesale: 660 },
  Beans: { current: 980, volatility: 0.09, growth30: 0.07, demand: 84, export: 1080, wholesale: 910 },
  "Irish Potato": { current: 520, volatility: 0.11, growth30: 0.03, demand: 79, export: 610, wholesale: 470 },
  "Sweet Potato": { current: 460, volatility: 0.07, growth30: 0.02, demand: 71, export: 530, wholesale: 410 },
  Cassava: { current: 430, volatility: 0.06, growth30: 0.01, demand: 66, export: 500, wholesale: 390 },
  Sorghum: { current: 610, volatility: 0.05, growth30: 0.03, demand: 64, export: 690, wholesale: 560 },
  Banana: { current: 380, volatility: 0.1, growth30: 0.02, demand: 77, export: 430, wholesale: 340 },
  Plantain: { current: 420, volatility: 0.09, growth30: 0.025, demand: 76, export: 470, wholesale: 380 },
  Groundnuts: { current: 1450, volatility: 0.08, growth30: 0.05, demand: 83, export: 1580, wholesale: 1360 },
  Peas: { current: 890, volatility: 0.07, growth30: 0.04, demand: 67, export: 960, wholesale: 820 },
  Coffee: { current: 2100, volatility: 0.06, growth30: 0.08, demand: 88, export: 2380, wholesale: 1950 },
  Tea: { current: 1750, volatility: 0.05, growth30: 0.05, demand: 85, export: 1940, wholesale: 1620 },
};

const RWANDA_MARKET_DIRECTORY = [
  { name: "Nyamata Market", district: "Bugesera", province: "Eastern", lat: -2.1405, lng: 30.1022, access: 88, road: "Paved highway access" },
  { name: "Gako Market", district: "Bugesera", province: "Eastern", lat: -2.1754, lng: 30.1035, access: 76, road: "Good feeder-road access" },
  { name: "Ruhuha Market", district: "Bugesera", province: "Eastern", lat: -2.2392, lng: 30.1936, access: 69, road: "Seasonal feeder access" },
  { name: "Zinia Market", district: "Kicukiro", province: "Kigali City", lat: -1.9838, lng: 30.1014, access: 82, road: "Urban collector road" },
  { name: "Kanserege Market", district: "Kicukiro", province: "Kigali City", lat: -1.9927, lng: 30.1086, access: 78, road: "Mixed traffic route" },
  { name: "Kicukiro New Modern Market", district: "Kicukiro", province: "Kigali City", lat: -1.9704, lng: 30.1059, access: 91, road: "Modern wholesale entry" },
  { name: "Nyabugogo Market", district: "Nyarugenge", province: "Kigali City", lat: -1.9446, lng: 30.0619, access: 89, road: "Major truck route" },
  { name: "Kimironko Market", district: "Gasabo", province: "Kigali City", lat: -1.944, lng: 30.1131, access: 87, road: "High-volume urban market" },
  { name: "Musanze Main Market", district: "Musanze", province: "Northern", lat: -1.4996, lng: 29.6344, access: 84, road: "Regional collector point" },
  { name: "Kinigi Exchange Point", district: "Musanze", province: "Northern", lat: -1.4328, lng: 29.5874, access: 67, road: "Mountain access road" },
  { name: "Huye Central Market", district: "Huye", province: "Southern", lat: -2.5967, lng: 29.7394, access: 83, road: "Reliable district road" },
  { name: "Ngoma Trading Point", district: "Huye", province: "Southern", lat: -2.6125, lng: 29.7488, access: 72, road: "Good but slower loading access" },
  { name: "Rubavu Border Market", district: "Rubavu", province: "Western", lat: -1.679, lng: 29.2589, access: 86, road: "Border trade route" },
  { name: "Gisenyi Produce Market", district: "Rubavu", province: "Western", lat: -1.7026, lng: 29.2579, access: 80, road: "Urban + border route" },
  { name: "Rwamagana Market", district: "Rwamagana", province: "Eastern", lat: -1.9499, lng: 30.4347, access: 79, road: "District aggregation route" },
  { name: "Kigabiro Trading Hub", district: "Rwamagana", province: "Eastern", lat: -1.9524, lng: 30.4416, access: 74, road: "Cooperative buyer route" },
  { name: "Kayonza Market", district: "Kayonza", province: "Eastern", lat: -1.8772, lng: 30.6451, access: 81, road: "Processor route access" },
  { name: "Mukarange Collection Point", district: "Kayonza", province: "Eastern", lat: -1.8779, lng: 30.6507, access: 71, road: "Feeder-road aggregation point" },
];

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(MARKET_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(state));
}

function createDefaultFarm() {
  return {
    id: "market-default-farm",
    name: "Primary Market Plot",
    region: "Northern Highlands",
    sizeHectares: 10,
    primaryCrop: "Wheat",
    location: { lat: -1.94, lng: 29.87, label: "Northern Highlands" },
  };
}

function formatRwf(value) {
  return `RWF ${Math.round(Number(value) || 0).toLocaleString()}`;
}

function normalizeCropSelection(value) {
  if (value === "Maize" || value === "Hybrid Corn") return "Corn";
  if (value === "Bush Beans" || value === "Climbing Beans") return "Beans";
  if (value === "Potato" || value === "Potatoes") return "Irish Potato";
  if (value === "Groundnut" || value === "Peanut" || value === "Peanuts") return "Groundnuts";
  if (value === "Green Banana" || value === "Matoke") return "Banana";
  return cropFilters.includes(value) ? value : "Wheat";
}

function inferFarmDistrict(farm) {
  const searchSpace = [farm?.region, farm?.location?.label, farm?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const found = RWANDA_MARKET_DIRECTORY.find((market) =>
    searchSpace.includes(market.district.toLowerCase())
  );
  return found?.district || "Nyarugenge";
}

function inferFarmProvince(farm) {
  const district = inferFarmDistrict(farm);
  const found = RWANDA_MARKET_DIRECTORY.find((market) => market.district === district);
  return found?.province || "Kigali City";
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDemandLabel(score) {
  if (score >= 82) return "High";
  if (score >= 68) return "Medium";
  return "Low";
}

function getTrendLabel(changePct) {
  if (changePct >= 7) return "Rising Fast";
  if (changePct >= 2) return "Rising";
  if (changePct <= -6) return "Falling";
  return "Stable";
}

function getRecommendationLabel(score) {
  if (score >= 82) return "Best Choice";
  if (score >= 70) return "Good Option";
  if (score >= 55) return "Moderate";
  return "Avoid";
}

function createMapEmbedUrl(selectedFarm, markets) {
  const farmLat = selectedFarm?.location?.lat ?? -1.9441;
  const farmLng = selectedFarm?.location?.lng ?? 30.0619;
  const lats = [farmLat, ...markets.map((market) => market.coordinates.lat)];
  const lngs = [farmLng, ...markets.map((market) => market.coordinates.lng)];
  const minLat = Math.min(...lats) - 0.03;
  const maxLat = Math.max(...lats) + 0.03;
  const minLng = Math.min(...lngs) - 0.03;
  const maxLng = Math.max(...lngs) + 0.03;
  const bbox = [minLng, minLat, maxLng, maxLat].map((value) => value.toFixed(4)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${farmLat.toFixed(4)}%2C${farmLng.toFixed(4)}`;
}

function buildForecastWindows(basePrice, growth30, volatility, demandScore) {
  const growth7 = growth30 * 0.35 + (demandScore - 70) * 0.001;
  const growth90 = growth30 * 2.1 - volatility * 0.15;
  const predicted7 = Math.round(basePrice * (1 + growth7));
  const predicted30 = Math.round(basePrice * (1 + growth30));
  const predicted90 = Math.round(basePrice * (1 + growth90));
  const confidence = clamp(Math.round(62 + demandScore * 0.22 - volatility * 90), 58, 95);

  return [
    {
      label: "7 Days",
      currentPrice: basePrice,
      predictedPrice: predicted7,
      forecastChange: Number((((predicted7 - basePrice) / basePrice) * 100).toFixed(1)),
      confidence,
    },
    {
      label: "30 Days",
      currentPrice: basePrice,
      predictedPrice: predicted30,
      forecastChange: Number((((predicted30 - basePrice) / basePrice) * 100).toFixed(1)),
      confidence: clamp(confidence - 4, 52, 92),
    },
    {
      label: "90 Days",
      currentPrice: basePrice,
      predictedPrice: predicted90,
      forecastChange: Number((((predicted90 - basePrice) / basePrice) * 100).toFixed(1)),
      confidence: clamp(confidence - 8, 48, 88),
    },
  ];
}

function buildMarketData({ farm, crop, timeframe }) {
  const profile = CROP_MARKET_PROFILE[crop] || CROP_MARKET_PROFILE.Wheat;
  const district = inferFarmDistrict(farm);
  const province = inferFarmProvince(farm);
  const farmLat = Number(farm?.location?.lat || -1.9441);
  const farmLng = Number(farm?.location?.lng || 30.0619);
  const seed = Math.round(Math.abs(farmLat) * 100 + Math.abs(farmLng) * 100 + Number(farm?.sizeHectares || 0));

  const candidateMarkets = RWANDA_MARKET_DIRECTORY.filter(
    (market) => market.district === district || market.province === province
  );

  const markets = candidateMarkets
    .map((market, index) => {
      const distanceKm = haversineKm(farmLat, farmLng, market.lat, market.lng);
      const priceVariance = ((seed + index * 9) % 45) - 18;
      const currentPrice = profile.current + priceVariance;
      const demandScore = clamp(profile.demand + (market.access - 75) * 0.35 - distanceKm * 1.4, 42, 97);
      const trendChange = Number((profile.growth30 * 100 + ((seed + index * 7) % 6) - 2).toFixed(1));
      const distanceScore = clamp(100 - distanceKm * 4.2, 18, 100);
      const accessScore = market.access;
      const opportunityScore = Math.round(
        currentPrice * 0.4 * (100 / (profile.current * 1.35)) +
        demandScore * 0.3 +
        distanceScore * 0.2 +
        accessScore * 0.1
      );

      return {
        id: `${market.name}-${crop}`,
        name: market.name,
        district: market.district,
        province: market.province,
        distanceKm,
        distanceLabel: `${distanceKm.toFixed(1)} km`,
        currentPrice,
        currentPriceLabel: `${formatRwf(currentPrice)} / kg`,
        wholesalePriceLabel: `${formatRwf(profile.wholesale + Math.round(priceVariance * 0.85))} / kg`,
        exportPriceLabel: `${formatRwf(profile.export + Math.round(priceVariance * 1.15))} / kg`,
        demandScore,
        demandLabel: getDemandLabel(demandScore),
        trendChange,
        trendLabel: getTrendLabel(trendChange),
        accessibilityScore: accessScore,
        accessibilityLabel: accessScore >= 85 ? "Excellent" : accessScore >= 72 ? "Good" : "Limited",
        recommendation: getRecommendationLabel(opportunityScore),
        opportunityScore: clamp(opportunityScore, 35, 98),
        routeNote: market.road,
        coordinates: { lat: market.lat, lng: market.lng },
        updatedAt: "2026-06-18",
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const basePrice = Math.round(
    markets.reduce((sum, market) => sum + market.currentPrice, 0) / Math.max(markets.length, 1)
  );
  const trendLength = timeframe === "6M" ? 6 : timeframe === "90D" ? 8 : 10;
  const trendBars = Array.from({ length: trendLength }, (_, index) => {
    const seasonal = Math.sin((index + seed / 8) * 0.7) * 7;
    const drift = profile.growth30 * 100 * (index / trendLength) * 1.1;
    return Math.round(30 + seasonal + drift + (profile.demand - 60) * 0.22);
  });

  const forecasts = buildForecastWindows(basePrice, profile.growth30, profile.volatility, profile.demand);
  const bestMarket = markets[0];
  const aiDecision =
    forecasts[0].forecastChange >= 4
      ? "Wait 7 Days"
      : profile.export > basePrice * 1.22 && bestMarket?.province !== "Kigali City"
        ? "Export Opportunity"
        : bestMarket?.opportunityScore >= 82
          ? "Sell Now"
          : "Wait 14 Days";

  const aiReason =
    aiDecision === "Wait 7 Days"
      ? `Demand forecast is increasing and prices are expected to rise by ${forecasts[0].forecastChange}%.`
      : aiDecision === "Export Opportunity"
        ? "Export and wholesale spreads are strong enough to justify a premium selling channel."
        : aiDecision === "Sell Now"
          ? `${bestMarket?.name || "Top market"} currently offers the strongest score with good access and price.`
          : "Current signals are stable, but a later window may improve margin if transport is planned well.";

  const logisticsTips = [
    `Nearest district markets for ${district} are ranked by opportunity and route distance from ${farm.name}.`,
    "Prioritize markets with good accessibility during rainy periods to reduce spoilage and delay.",
    "Bulk loads above 8 tons should compare wholesale and export channels before dispatch.",
  ];

  const platforms = [
    {
      title: "Local Market Platforms",
      description: "Use district-level buyer coordination and cooperative trading boards.",
      actionLabel: "Open Platform",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${district} crop market platform Rwanda`)}`,
    },
    {
      title: "Wholesale Platforms",
      description: "Review larger buyer networks and transport-backed aggregation channels.",
      actionLabel: "Visit Market Website",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${crop} wholesale buyers Rwanda`)}`,
    },
    {
      title: "Export Platforms",
      description: "Benchmark export buyers and cross-border opportunity channels.",
      actionLabel: "Open Platform",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${crop} export buyers Rwanda`)}`,
    },
  ];

  return {
    district,
    province,
    trendBars,
    forecasts,
    markets,
    bestMarket,
    aiDecision,
    aiReason,
    aiConfidence: clamp(Math.round((bestMarket?.opportunityScore || 68) * 0.88), 58, 95),
    logisticsTips,
    platforms,
    currentPrice: basePrice,
    demandForecast: clamp(Math.round(markets.reduce((sum, market) => sum + market.demandScore, 0) / Math.max(markets.length, 1)), 40, 96),
    mapUrl: createMapEmbedUrl(farm, markets),
  };
}

export function MarketPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const stored = useMemo(() => loadStoredState(), []);
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "market-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(
    normalizeCropSelection(stored.selectedCrop || farms[0]?.primaryCrop || "Wheat")
  );
  const [timeframe, setTimeframe] = useState(stored.timeframe || "30D");
  const [targetPrice, setTargetPrice] = useState(stored.targetPrice || "750");
  const [alerts, setAlerts] = useState(stored.alerts || []);

  useEffect(() => {
    saveStoredState({ selectedCrop, timeframe, targetPrice, alerts });
  }, [selectedCrop, timeframe, targetPrice, alerts]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "market-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  const market = useMemo(
    () => buildMarketData({ farm: selectedFarm, crop: selectedCrop, timeframe }),
    [selectedFarm, selectedCrop, timeframe]
  );

  const createAlert = () => {
    const price = Number(targetPrice);
    if (!price || !market.bestMarket) return;
    const nextAlert = {
      id: `${selectedFarm.id}-${selectedCrop}-${price}-${market.bestMarket.name}`,
      crop: selectedCrop,
      targetPrice: Math.round(price),
      currentPrice: market.bestMarket.currentPrice,
      createdAt: new Date().toISOString(),
      status: price <= market.bestMarket.currentPrice ? "Target reached" : "Monitoring",
    };
    setAlerts((current) => {
      if (current.some((item) => item.id === nextAlert.id)) return current;
      return [nextAlert, ...current].slice(0, 6);
    });
  };

  return (
    <section className="management-page prototype-market-page upgraded-market-page">
      <div className="page-title-block prototype-market-title">
        <h1>Market Intelligence</h1>
        <p>
          Location-aware crop pricing, demand forecasting, logistics guidance, and AI-supported selling decisions.
        </p>
      </div>

      <div className="prototype-market-toolbar">
        <label className="prototype-market-toolbar-field">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>

        <label className="prototype-market-toolbar-field">
          <span>Time horizon</span>
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
            <option value="30D">30 Days</option>
            <option value="90D">90 Days</option>
            <option value="6M">6 Months</option>
          </select>
        </label>

        <label className="prototype-market-toolbar-field">
          <span>Target price alert</span>
          <div className="prototype-market-alert-inline">
            <input type="number" step="1" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} />
            <button type="button" className="prototype-market-alert-button" onClick={createAlert}>
              <Bell size={16} />
              <span>Set Alert</span>
            </button>
          </div>
        </label>
      </div>

      <div className="prototype-market-context-row">
        <div className="prototype-market-context-card">
          <strong>Farm district</strong>
          <span>{market.district}</span>
        </div>
        <div className="prototype-market-context-card">
          <strong>Province</strong>
          <span>{market.province}</span>
        </div>
        <div className="prototype-market-context-card">
          <strong>Coordinates</strong>
          <span>
            {selectedFarm.location.lat.toFixed(4)}, {selectedFarm.location.lng.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="prototype-market-head-actions">
        <div className="prototype-market-filters">
          {cropFilters.map((crop) => (
            <button
              key={crop}
              type="button"
              className={selectedCrop === crop ? "prototype-market-filter active" : "prototype-market-filter"}
              onClick={() => setSelectedCrop(crop)}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <div className="prototype-market-grid upgraded">
        <div className="prototype-market-main">
          <article className="prototype-panel prototype-market-chart-panel">
            <div className="prototype-market-panel-head">
              <h2>Live & Historical Price Trend ({timeframe})</h2>
              <span className="prototype-market-growth">
                {market.forecasts[1].forecastChange >= 0 ? "+" : ""}
                {market.forecasts[1].forecastChange}% 30-day direction
              </span>
            </div>

            <div className="prototype-market-chart">
              <div className="prototype-market-chart-lines">
                {[1, 2, 3, 4].map((line) => (
                  <i key={line} />
                ))}
              </div>
              <div className="prototype-market-bars">
                {market.trendBars.map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className={index === market.trendBars.length - 1 ? "active" : ""}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="prototype-market-axis">
                <span>Start</span>
                <span>Demand build-up</span>
                <span>Peak trading</span>
                <span>Today</span>
              </div>
            </div>
          </article>

          <article className="prototype-panel market-forecast-panel">
            <div className="prototype-market-panel-head">
              <h2>Price Forecasting</h2>
              <span>Current vs predicted</span>
            </div>
            <div className="market-forecast-grid">
              {market.forecasts.map((forecast) => (
                <div key={forecast.label} className="market-forecast-card">
                  <strong>{forecast.label}</strong>
                  <span>Current Price</span>
                  <h3>{formatRwf(forecast.currentPrice)}</h3>
                  <span>Predicted Price</span>
                  <h4>{formatRwf(forecast.predictedPrice)}</h4>
                  <p>
                    Forecast Change: {forecast.forecastChange >= 0 ? "+" : ""}
                    {forecast.forecastChange}%
                  </p>
                  <small>{forecast.confidence}% confidence</small>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel prototype-market-table-panel">
            <div className="prototype-market-panel-head">
              <h2>Nearby Market Ranking</h2>
              <span>Sorted by Market Opportunity Score</span>
            </div>

            <div className="prototype-market-table market-comparison-table">
              <div className="prototype-market-table-head">
                <span>Market</span>
                <span>Distance</span>
                <span>Current Price</span>
                <span>Demand</span>
                <span>Trend</span>
                <span>Accessibility</span>
                <span>Recommendation</span>
              </div>

              {market.markets.map((row, index) => (
                <div key={row.id} className={`prototype-market-table-row market-module-row ${index === 0 ? "best-market" : ""}`}>
                  <strong className="market-name-cell">
                    <MapPinned size={17} />
                    <span>{row.name}</span>
                  </strong>
                  <span>{row.distanceLabel}</span>
                  <strong>{row.currentPriceLabel}</strong>
                  <span>{row.demandLabel}</span>
                  <span>{row.trendLabel}</span>
                  <span>{row.accessibilityLabel}</span>
                  <div className="market-recommendation-cell">
                    <span className={`market-recommendation-pill ${row.recommendation.toLowerCase().replace(/\s+/g, "-")}`}>
                      {row.recommendation}
                    </span>
                    <small>{row.opportunityScore}/100</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel market-logistics-upgraded">
            <div className="prototype-market-panel-head">
              <h2>Market Accessibility & Logistics Tips</h2>
              <span>Distance, route, and field access awareness</span>
            </div>
            <div className="prototype-market-logistics-grid">
              {market.logisticsTips.map((tip) => (
                <div key={tip} className="prototype-market-logistics-card">
                  <ShipWheel size={18} />
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="prototype-market-side">
          <article className="prototype-market-insight-card upgraded-advisory">
            <div className="prototype-market-insight-head">
              <div className="prototype-market-insight-icon">
                <Bot size={18} />
              </div>
              <div>
                <strong>AI Selling Recommendation</strong>
                <span>Location-aware market advisory</span>
              </div>
            </div>

            <div className="prototype-market-insight-box">
              <span>Recommendation</span>
              <h3>{market.aiDecision}</h3>
            </div>

            <p>{market.aiReason}</p>

            <div className="prototype-market-confidence">
              <div className="prototype-market-confidence-top">
                <span>Confidence</span>
                <strong>{market.aiConfidence}%</strong>
              </div>
              <div className="prototype-market-confidence-track">
                <div className="prototype-market-confidence-fill" style={{ width: `${market.aiConfidence}%` }} />
              </div>
            </div>
          </article>

          <article className="prototype-panel prototype-market-stats-card">
            <h3>Market Opportunity Snapshot</h3>
            <div className="prototype-market-stats-grid expanded">
              <div className="prototype-market-stat-box">
                <span>Best Market</span>
                <strong>{market.bestMarket?.name || "--"}</strong>
              </div>
              <div className="prototype-market-stat-box">
                <span>Top Crop Price</span>
                <strong>{formatRwf(market.currentPrice)}</strong>
              </div>
              <div className="prototype-market-stat-box">
                <span>Demand Forecast</span>
                <strong>{market.demandForecast}/100</strong>
              </div>
              <div className="prototype-market-stat-box positive">
                <span>Best Score</span>
                <strong>{market.bestMarket?.opportunityScore || "--"}</strong>
              </div>
            </div>
          </article>

          <article className="prototype-panel prototype-market-map-card upgraded">
            <div className="prototype-market-map-visual">
              <iframe
                title="Nearby market map"
                src={market.mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span className="prototype-market-map-badge">
                {market.bestMarket ? `${market.bestMarket.distanceLabel} to best market` : "Nearby"}
              </span>
            </div>
            <div className="prototype-market-map-copy">
              <strong>Farm & Nearby Markets Map</strong>
              <p>
                Markets are generated from the selected farm district and sorted by distance and opportunity.
              </p>
            </div>
            <div className="market-map-actions">
              {market.bestMarket ? (
                <>
                  <a
                    className="prototype-market-map-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${market.bestMarket.coordinates.lat},${market.bestMarket.coordinates.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Market
                  </a>
                  <a
                    className="prototype-market-map-link"
                    href={`https://www.google.com/maps/dir/?api=1&origin=${selectedFarm.location.lat},${selectedFarm.location.lng}&destination=${market.bestMarket.coordinates.lat},${market.bestMarket.coordinates.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Map
                  </a>
                </>
              ) : null}
            </div>
          </article>

          <article className="prototype-panel prototype-market-alerts-card">
            <div className="prototype-market-export-head">
              <TrendingUp size={18} />
              <h3>Price Alerts</h3>
            </div>
            <div className="prototype-market-alert-list upgraded">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="prototype-market-alert-row detailed">
                    <strong>{alert.crop}</strong>
                    <span>Created: {new Date(alert.createdAt).toLocaleDateString("en-ZA")}</span>
                    <span>Target Price: {formatRwf(alert.targetPrice)}</span>
                    <span>Current Price: {formatRwf(alert.currentPrice)}</span>
                    <small>{alert.status}</small>
                  </div>
                ))
              ) : (
                <p className="prototype-market-empty-copy">No price alerts yet. Set a target price to start notifications.</p>
              )}
            </div>
          </article>

          <article id="market-platforms" className="prototype-panel prototype-market-export-card">
            <div className="prototype-market-export-head">
              <PackageCheck size={18} />
              <h3>Market Platforms</h3>
            </div>
            <div className="prototype-market-export-list upgraded">
              {market.platforms.map((platform) => (
                <div key={platform.title} className="market-platform-card">
                  <strong>{platform.title}</strong>
                  <span>{platform.description}</span>
                  <a href={platform.href} target="_blank" rel="noreferrer" className="prototype-market-platform-link">
                    <ExternalLink size={15} />
                    <span>{platform.actionLabel}</span>
                  </a>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel prototype-market-export-card">
            <div className="prototype-market-export-head">
              <Route size={18} />
              <h3>Wholesale & Export Information</h3>
            </div>
            <div className="prototype-market-export-list">
              <div>
                <strong>Wholesale Benchmark</strong>
                <span>{market.bestMarket?.wholesalePriceLabel || "--"} for the current crop window.</span>
              </div>
              <div>
                <strong>Export Benchmark</strong>
                <span>{market.bestMarket?.exportPriceLabel || "--"} if crop quality and volume meet export channel thresholds.</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
