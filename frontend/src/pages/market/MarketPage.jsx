import { Bell, Bot, ExternalLink, MapPin, PackageCheck, ShipWheel, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FarmerPrototypeTopbar } from "../../components/common/FarmerPrototypeTopbar";
import { useFarmerData } from "../../context/FarmerDataContext";

const MARKET_STORAGE_KEY = "agri-feed-market-module-v1";
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
const CROP_PRICE_BASE = {
  Wheat: { retail: 860, wholesale: 790, export: 980, demand: "High" },
  Corn: { retail: 680, wholesale: 620, export: 760, demand: "High" },
  Soybeans: { retail: 930, wholesale: 870, export: 1020, demand: "High" },
  Rice: { retail: 1420, wholesale: 1320, export: 1560, demand: "Medium" },
  Barley: { retail: 720, wholesale: 660, export: 790, demand: "Medium" },
  Beans: { retail: 980, wholesale: 910, export: 1080, demand: "High" },
  "Irish Potato": { retail: 520, wholesale: 470, export: 610, demand: "High" },
  "Sweet Potato": { retail: 460, wholesale: 410, export: 530, demand: "Medium" },
  Cassava: { retail: 430, wholesale: 390, export: 500, demand: "Medium" },
  Sorghum: { retail: 610, wholesale: 560, export: 690, demand: "Medium" },
  Banana: { retail: 380, wholesale: 340, export: 430, demand: "High" },
  Plantain: { retail: 420, wholesale: 380, export: 470, demand: "High" },
  Groundnuts: { retail: 1450, wholesale: 1360, export: 1580, demand: "High" },
  Peas: { retail: 890, wholesale: 820, export: 960, demand: "Medium" },
  Coffee: { retail: 2100, wholesale: 1950, export: 2380, demand: "High" },
  Tea: { retail: 1750, wholesale: 1620, export: 1940, demand: "High" },
};

const DISTRICT_MARKET_LOCATIONS = {
  Kicukiro: [
    {
      market: "Zinia Market",
      district: "Kicukiro",
      region: "Kigali City",
      transportNote: "Strong neighborhood demand and short urban delivery routes",
      coordinates: { lat: -1.9838, lng: 30.1014 },
      priceOffset: 0,
      demandBias: 5,
    },
    {
      market: "Kanserege Market",
      district: "Kicukiro",
      region: "Kigali City",
      transportNote: "Good buyer turnover, but loading space is limited at peak hours",
      coordinates: { lat: -1.9927, lng: 30.1086 },
      priceOffset: 18,
      demandBias: 2,
    },
    {
      market: "Kicukiro Modern Market",
      district: "Kicukiro",
      region: "Kigali City",
      transportNote: "Reliable wholesale access and better handling for bulk produce",
      coordinates: { lat: -1.9704, lng: 30.1059 },
      priceOffset: 26,
      demandBias: 7,
    },
  ],
  Musanze: [
    {
      market: "Musanze Main Market",
      district: "Musanze",
      region: "Northern",
      transportNote: "Northern grain buyers are active this week",
      coordinates: { lat: -1.4996, lng: 29.6344 },
      priceOffset: 20,
      demandBias: 6,
    },
    {
      market: "Kinigi Exchange Point",
      district: "Musanze",
      region: "Northern",
      transportNote: "Cool-climate cereals move best early morning",
      coordinates: { lat: -1.4328, lng: 29.5874 },
      priceOffset: 10,
      demandBias: 3,
    },
  ],
  Huye: [
    {
      market: "Huye Central Market",
      district: "Huye",
      region: "Southern",
      transportNote: "Higher margin, quality grading matters",
      coordinates: { lat: -2.5967, lng: 29.7394 },
      priceOffset: 12,
      demandBias: 2,
    },
    {
      market: "Ngoma Trading Point",
      district: "Huye",
      region: "Southern",
      transportNote: "Fast local movement with moderate storage capacity",
      coordinates: { lat: -2.6125, lng: 29.7488 },
      priceOffset: -8,
      demandBias: 1,
    },
  ],
  Rubavu: [
    {
      market: "Rubavu Border Market",
      district: "Rubavu",
      region: "Western",
      transportNote: "Border trade favorable, timing matters",
      coordinates: { lat: -1.679, lng: 29.2589 },
      priceOffset: 16,
      demandBias: 4,
    },
    {
      market: "Gisenyi Produce Market",
      district: "Rubavu",
      region: "Western",
      transportNote: "Strong cross-border buyer visibility for quality loads",
      coordinates: { lat: -1.7026, lng: 29.2579 },
      priceOffset: 6,
      demandBias: 3,
    },
  ],
  Rwamagana: [
    {
      market: "Rwamagana Market",
      district: "Rwamagana",
      region: "Eastern",
      transportNote: "Stable supply, bulk buyers seasonal",
      coordinates: { lat: -1.9499, lng: 30.4347 },
      priceOffset: 4,
      demandBias: 2,
    },
    {
      market: "Kigabiro Trading Hub",
      district: "Rwamagana",
      region: "Eastern",
      transportNote: "Moderate queue, cooperative buyers active",
      coordinates: { lat: -1.9524, lng: 30.4416 },
      priceOffset: -10,
      demandBias: 1,
    },
  ],
  Kayonza: [
    {
      market: "Kayonza Market",
      district: "Kayonza",
      region: "Eastern",
      transportNote: "Strong processor demand, transport manageable",
      coordinates: { lat: -1.8772, lng: 30.6451 },
      priceOffset: 10,
      demandBias: 5,
    },
    {
      market: "Mukarange Collection Point",
      district: "Kayonza",
      region: "Eastern",
      transportNote: "Good feeder-road access for farmgate aggregation",
      coordinates: { lat: -1.8779, lng: 30.6507 },
      priceOffset: -5,
      demandBias: 2,
    },
  ],
  Nyarugenge: [
    {
      market: "Nyabugogo Market",
      district: "Nyarugenge",
      region: "Kigali City",
      transportNote: "Easy truck access, strong buyer turnover",
      coordinates: { lat: -1.9446, lng: 30.0619 },
      priceOffset: 12,
      demandBias: 4,
    },
    {
      market: "Kimironko Transfer Yard",
      district: "Nyarugenge",
      region: "Kigali City",
      transportNote: "Urban buyers pay better for early arrivals",
      coordinates: { lat: -1.944, lng: 30.0822 },
      priceOffset: 22,
      demandBias: 5,
    },
  ],
};

function formatRwf(value) {
  return `RWF ${Math.round(Number(value) || 0).toLocaleString()}`;
}

function normalizeCropSelection(value) {
  if (value === "Maize") return "Corn";
  if (value === "Hybrid Corn") return "Corn";
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

  const districtMatch = Object.keys(DISTRICT_MARKET_LOCATIONS).find((district) =>
    searchSpace.includes(district.toLowerCase())
  );

  return districtMatch || "Nyarugenge";
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

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createMapEmbedUrl(selectedFarm, selectedMarket) {
  const marketLat = selectedMarket?.coordinates?.lat ?? selectedFarm?.location?.lat ?? -1.9441;
  const marketLng = selectedMarket?.coordinates?.lng ?? selectedFarm?.location?.lng ?? 30.0619;
  const delta = 0.1;
  const bbox = [
    (marketLng - delta).toFixed(4),
    (marketLat - delta).toFixed(4),
    (marketLng + delta).toFixed(4),
    (marketLat + delta).toFixed(4),
  ].join("%2C");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marketLat.toFixed(4)}%2C${marketLng.toFixed(4)}`;
}

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
    location: { lat: -1.94, lng: 29.87 },
  };
}

function hashFarm(farm) {
  return (
    Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100) +
    Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100) +
    Math.round(Number(farm?.sizeHectares || 0)) * 3
  );
}

function buildMarketData({ farm, crop, timeframe }) {
  const seed = hashFarm(farm);
  const farmDistrict = inferFarmDistrict(farm);
  const districtMarkets = DISTRICT_MARKET_LOCATIONS[farmDistrict] || DISTRICT_MARKET_LOCATIONS.Nyarugenge;
  const cropBase = CROP_PRICE_BASE[crop] || CROP_PRICE_BASE.Wheat;
  const basePrice = cropBase.wholesale;
  const trendLength = timeframe === "6M" ? 6 : timeframe === "90D" ? 8 : 10;

  const trendBars = Array.from({ length: trendLength }, (_, index) => {
    const seasonal = Math.sin((index + seed / 10) * 0.6) * 6;
    const growth = index * 2.4;
    return Math.round(34 + growth + seasonal + (seed % 5));
  });

  const latestBar = trendBars[trendBars.length - 1];
  const firstBar = trendBars[0];
  const changePct = Number((((latestBar - firstBar) / Math.max(firstBar, 1)) * 100).toFixed(1));
  const demandScore = 62 + (seed % 27) + (crop === normalizeCropSelection(farm.primaryCrop) ? 6 : 0);
  const bestWindow = demandScore > 82 ? "Next 3-5 Days" : demandScore > 72 ? "Next 5-7 Days" : "Monitor for 7-10 Days";

  const markets = districtMarkets
    .map((entry) => {
      const distanceKm = haversineKm(
        Number(farm?.location?.lat || -1.9441),
        Number(farm?.location?.lng || 30.0619),
        entry.coordinates.lat,
        entry.coordinates.lng
      );

      return {
        id: `${entry.market}-${crop}`,
        name: entry.market,
        district: entry.district,
        region: entry.region,
        distanceKm,
        distance: `${distanceKm.toFixed(1)} km`,
        price: `${formatRwf(cropBase.retail + entry.priceOffset)} / kg`,
        retailValue: cropBase.retail + entry.priceOffset,
        wholesaleValue: cropBase.wholesale + Math.round(entry.priceOffset * 0.9),
        exportValue: cropBase.export + Math.round(entry.priceOffset * 1.1),
        wholesalePrice: `${formatRwf(cropBase.wholesale + Math.round(entry.priceOffset * 0.9))} / kg`,
        exportPrice: `${formatRwf(cropBase.export + Math.round(entry.priceOffset * 1.1))} / kg`,
        access: entry.transportNote,
        demand: cropBase.demand,
        updatedAt: "2026-06-14",
        coordinates: entry.coordinates,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const logisticsTips = [
    "Bundle transport with nearby farmers to reduce haulage cost by up to 14%.",
    "Prioritize the nearest paved-route market after rainfall to avoid access delays.",
    "Use wholesale route when volume exceeds 8 tons for stronger price negotiation.",
  ];

  const currentPrice = Math.round(average(markets.map((row) => row.retailValue)) || (basePrice + latestBar * 4.8));
  const wholesalePrice = Math.round(average(markets.map((row) => row.wholesaleValue)) || currentPrice - 35);
  const exportPrice = Math.round(average(markets.map((row) => row.exportValue)) || currentPrice + 60);

  return {
    trendBars,
    currentPrice,
    wholesalePrice,
    exportPrice,
    changePct,
    demandScore,
    bestWindow,
    markets,
    logisticsTips,
    confidence: Math.min(95, demandScore + 7),
    demandLabel:
      demandScore > 85 ? "Very High" : demandScore > 72 ? "Strong" : "Moderate",
    farmDistrict,
  };
}

export function MarketPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const stored = useMemo(() => loadStoredState(), []);
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "market-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(normalizeCropSelection(stored.selectedCrop || farms[0]?.primaryCrop || "Wheat"));
  const [timeframe, setTimeframe] = useState(stored.timeframe || "30D");
  const [targetPrice, setTargetPrice] = useState(stored.targetPrice || "750");
  const [alerts, setAlerts] = useState(stored.alerts || []);

  useEffect(() => {
    saveStoredState({ selectedCrop, timeframe, targetPrice, alerts });
  }, [alerts, selectedCrop, targetPrice, timeframe]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "market-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  useEffect(() => {
    if (!selectedCrop) {
      setSelectedCrop(normalizeCropSelection(selectedFarm?.primaryCrop || "Wheat"));
    }
  }, [selectedCrop, selectedFarm]);

  const market = useMemo(
    () => buildMarketData({ farm: selectedFarm, crop: selectedCrop, timeframe }),
    [selectedFarm, selectedCrop, timeframe]
  );
  const primaryMarket = market.markets[0];
  const mapEmbedUrl = useMemo(() => createMapEmbedUrl(selectedFarm, primaryMarket), [primaryMarket, selectedFarm]);

  const createAlert = () => {
    const price = Number(targetPrice);
    if (!price) return;
    const nextAlert = {
      id: `${selectedFarm.id}-${selectedCrop}-${price}`,
      crop: selectedCrop,
      farm: selectedFarm.name,
      target: Math.round(price),
      status: price <= market.currentPrice ? "Target already met" : "Watching target",
    };
    setAlerts((current) => {
      const exists = current.some((item) => item.id === nextAlert.id);
      return exists ? current : [nextAlert, ...current].slice(0, 4);
    });
  };

  return (
    <section className="management-page prototype-market-page">
      <FarmerPrototypeTopbar
        brand="AgriIntel AI"
        items={["Dashboard", "Market Trends", "Inventory", "Advice"]}
        active="Market Trends"
        placeholder="Search crops or markets"
      />

      <div className="page-title-block prototype-market-title">
        <h1>Market Intelligence</h1>
        <p>Live crop pricing, demand forecasting, logistics guidance, and best-time-to-sell recommendations.</p>
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
            <input type="number" step="0.01" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} />
            <button type="button" className="prototype-market-alert-button" onClick={createAlert}>
              <Bell size={16} />
              <span>Set Alert</span>
            </button>
          </div>
        </label>
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

      <div className="prototype-market-grid">
        <div className="prototype-market-main">
          <article className="prototype-panel prototype-market-chart-panel">
            <div className="prototype-market-panel-head">
              <h2>Price Trends ({timeframe})</h2>
              <span className={market.changePct >= 0 ? "prototype-market-growth" : "prototype-market-growth negative"}>
                {market.changePct >= 0 ? "+" : ""}
                {market.changePct}% vs start
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
                <span>Mid 1</span>
                <span>Mid 2</span>
                <span>Today</span>
              </div>
            </div>
          </article>

          <article className="prototype-panel prototype-market-table-panel">
            <div className="prototype-market-panel-head">
              <h2>Nearby Markets & Price Comparison</h2>
            </div>

            <div className="prototype-market-table">
              <div className="prototype-market-table-head">
                <span>Market Name</span>
                <span>Distance</span>
                <span>Current Price</span>
                <span>Access Notes</span>
                <span>Action</span>
              </div>

              {market.markets.map((row) => (
                <div key={row.id} className="prototype-market-table-row market-module-row">
                  <strong className="market-name-cell">
                    <MapPin size={17} />
                    <span>{row.name} · {row.district}</span>
                  </strong>
                  <span>{row.distance}</span>
                  <strong>{row.price}</strong>
                  <span>{row.access}</span>
                  <a
                    className="prototype-market-map-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${row.coordinates.lat},${row.coordinates.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Map
                  </a>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel prototype-market-logistics-panel">
            <div className="prototype-market-panel-head">
              <h2>Logistics & Market Accessibility Tips</h2>
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
          <article className="prototype-market-insight-card">
            <div className="prototype-market-insight-head">
              <div className="prototype-market-insight-icon">
                <Bot size={18} />
              </div>
              <div>
                <strong>AI Insight</strong>
                <span>Demand Forecast Live</span>
              </div>
            </div>

            <div className="prototype-market-insight-box">
              <span>Best time to sell</span>
              <h3>{market.bestWindow}</h3>
            </div>

            <p>
              {selectedCrop} demand is currently <strong>{market.demandLabel.toLowerCase()}</strong> in {selectedFarm.region}.
              Export and wholesale signals suggest gradual upside for the next release window.
            </p>

            <div className="prototype-market-confidence">
              <div className="prototype-market-confidence-top">
                <span>Confidence Level</span>
                <strong>{market.confidence}%</strong>
              </div>
              <div className="prototype-market-confidence-track">
                <div className="prototype-market-confidence-fill" style={{ width: `${market.confidence}%` }} />
              </div>
            </div>

            <button type="button" className="prototype-market-report-button">
              Generate Full Report
            </button>
          </article>

          <article className="prototype-panel prototype-market-stats-card">
            <h3>Demand & Price Outlook</h3>
            <div className="prototype-market-stats-grid expanded">
              <div className="prototype-market-stat-box">
                <span>Live Farmgate Price</span>
                <strong>{formatRwf(market.currentPrice)}</strong>
              </div>
              <div className="prototype-market-stat-box">
                <span>Wholesale Price</span>
                <strong>{formatRwf(market.wholesalePrice)}</strong>
              </div>
              <div className="prototype-market-stat-box">
                <span>Export Price</span>
                <strong>{formatRwf(market.exportPrice)}</strong>
              </div>
              <div className="prototype-market-stat-box positive">
                <span>Demand Forecast</span>
                <strong>{market.demandScore}/100</strong>
              </div>
            </div>
          </article>

          <article className="prototype-panel prototype-market-export-card">
            <div className="prototype-market-export-head">
              <PackageCheck size={18} />
              <h3>Export & Wholesale Channels</h3>
            </div>
            <div className="prototype-market-export-list">
              <div>
                <strong>Wholesale Buyers</strong>
                <span>{primaryMarket?.demand || "Medium"} buyer demand with farmgate-to-wholesale spread tracked for {selectedCrop.toLowerCase()}.</span>
              </div>
              <div>
                <strong>Export Outlook</strong>
                <span>{primaryMarket ? `${primaryMarket.exportPrice} benchmark for premium shipments.` : "Cross-border buyer demand remains supportive for premium deliveries."}</span>
              </div>
            </div>
            <a href="#market-platforms" className="prototype-market-platform-link">
              <ExternalLink size={15} />
              <span>View Market Platforms</span>
            </a>
          </article>

          <article className="prototype-panel prototype-market-map-card">
            <div className="prototype-market-map-visual">
              <iframe
                title="Nearby market map"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span className="prototype-market-map-badge">{primaryMarket ? primaryMarket.distance : "Nearby"}</span>
            </div>
            <div className="prototype-market-map-copy">
              <strong>Regional Market Activity</strong>
              <p>
                {primaryMarket
                  ? `${primaryMarket.name} in ${primaryMarket.district} is currently the nearest tracked ${selectedCrop.toLowerCase()} market for ${selectedFarm.name}. Showing all tracked district markets in ${market.farmDistrict}.`
                  : `Showing tracked market points within reach of ${selectedFarm.name}.`}
              </p>
            </div>
          </article>

          <article className="prototype-panel prototype-market-alerts-card">
            <div className="prototype-market-export-head">
              <TrendingUp size={18} />
              <h3>Price Alerts</h3>
            </div>
            <div className="prototype-market-alert-list">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="prototype-market-alert-row">
                    <strong>{alert.crop} at {formatRwf(alert.target)}</strong>
                    <span>{alert.status}</span>
                  </div>
                ))
              ) : (
                <p className="prototype-market-empty-copy">No price alerts yet. Set a target price to start notifications.</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
