import { Bell, Bot, ExternalLink, MapPin, PackageCheck, ShipWheel, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FarmerPrototypeTopbar } from "../../components/common/FarmerPrototypeTopbar";
import { useFarmerData } from "../../context/FarmerDataContext";

const MARKET_STORAGE_KEY = "agri-feed-market-module-v1";
const cropFilters = ["Wheat", "Corn", "Soybeans", "Rice", "Barley"];

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
  const cropOffsets = {
    Wheat: 7.4,
    Corn: 6.8,
    Soybeans: 8.2,
    Rice: 7.9,
    Barley: 6.5,
  };
  const basePrice = cropOffsets[crop] || 7.1;
  const trendLength = timeframe === "6M" ? 6 : timeframe === "90D" ? 8 : 10;

  const trendBars = Array.from({ length: trendLength }, (_, index) => {
    const seasonal = Math.sin((index + seed / 10) * 0.6) * 6;
    const growth = index * 2.4;
    return Math.round(34 + growth + seasonal + (seed % 5));
  });

  const latestBar = trendBars[trendBars.length - 1];
  const firstBar = trendBars[0];
  const changePct = Number((((latestBar - firstBar) / Math.max(firstBar, 1)) * 100).toFixed(1));
  const currentPrice = Number((basePrice + latestBar / 40).toFixed(2));
  const wholesalePrice = Number((currentPrice - 0.34).toFixed(2));
  const exportPrice = Number((currentPrice + 0.48).toFixed(2));
  const demandScore = 62 + (seed % 27) + (crop === farm.primaryCrop ? 6 : 0);
  const bestWindow = demandScore > 82 ? "Next 3-5 Days" : demandScore > 72 ? "Next 5-7 Days" : "Monitor for 7-10 Days";

  const markets = [
    {
      name: "Central Grain Exchange",
      distance: `${(12 + (seed % 4)).toFixed(1)} miles`,
      price: `$${(currentPrice + 0.08).toFixed(2)} / bu`,
      access: "Paved road, high buyer activity",
    },
    {
      name: "Valley Growers Hub",
      distance: `${(18 + (seed % 5)).toFixed(1)} miles`,
      price: `$${(currentPrice - 0.03).toFixed(2)} / bu`,
      access: "Moderate queue, cooperative buyers",
    },
    {
      name: "Regional Terminal A",
      distance: `${(24 + (seed % 6)).toFixed(1)} miles`,
      price: `$${(currentPrice + 0.11).toFixed(2)} / bu`,
      access: "Requires early morning loading slot",
    },
  ];

  const logisticsTips = [
    "Bundle transport with nearby farmers to reduce haulage cost by up to 14%.",
    "Prioritize the nearest paved-route market after rainfall to avoid access delays.",
    "Use wholesale route when volume exceeds 8 tons for stronger price negotiation.",
  ];

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
    demandLabel: demandScore > 85 ? "Very High" : demandScore > 72 ? "Strong" : "Moderate",
  };
}

export function MarketPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const stored = useMemo(() => loadStoredState(), []);
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "market-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(stored.selectedCrop || farms[0]?.primaryCrop || "Wheat");
  const [timeframe, setTimeframe] = useState(stored.timeframe || "30D");
  const [targetPrice, setTargetPrice] = useState(stored.targetPrice || "8.10");
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
      setSelectedCrop(selectedFarm?.primaryCrop || "Wheat");
    }
  }, [selectedCrop, selectedFarm]);

  const market = useMemo(
    () => buildMarketData({ farm: selectedFarm, crop: selectedCrop, timeframe }),
    [selectedFarm, selectedCrop, timeframe]
  );

  const createAlert = () => {
    const price = Number(targetPrice);
    if (!price) return;
    const nextAlert = {
      id: `${selectedFarm.id}-${selectedCrop}-${price}`,
      crop: selectedCrop,
      farm: selectedFarm.name,
      target: price.toFixed(2),
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
                <div key={row.name} className="prototype-market-table-row market-module-row">
                  <strong className="market-name-cell">
                    <MapPin size={17} />
                    <span>{row.name}</span>
                  </strong>
                  <span>{row.distance}</span>
                  <strong>{row.price}</strong>
                  <span>{row.access}</span>
                  <button type="button" className="prototype-market-map-link">
                    View Map
                  </button>
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
                <strong>${market.currentPrice}</strong>
              </div>
              <div className="prototype-market-stat-box">
                <span>Wholesale Price</span>
                <strong>${market.wholesalePrice}</strong>
              </div>
              <div className="prototype-market-stat-box">
                <span>Export Price</span>
                <strong>${market.exportPrice}</strong>
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
                <span>Cooperative grain buyers accepting 5+ ton lots this week.</span>
              </div>
              <div>
                <strong>Export Outlook</strong>
                <span>Cross-border buyer demand remains supportive for premium quality deliveries.</span>
              </div>
            </div>
            <a href="#market-platforms" className="prototype-market-platform-link">
              <ExternalLink size={15} />
              <span>View Market Platforms</span>
            </a>
          </article>

          <article className="prototype-panel prototype-market-map-card">
            <div className="prototype-market-map-visual">
              <div className="prototype-market-map-pin">
                <MapPin size={18} />
              </div>
              <span className="prototype-market-map-badge">Live Tracking</span>
            </div>
            <div className="prototype-market-map-copy">
              <strong>Regional Market Activity</strong>
              <p>Showing 15 active trading points within reach of {selectedFarm.name}.</p>
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
                    <strong>{alert.crop} at ${alert.target}</strong>
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
