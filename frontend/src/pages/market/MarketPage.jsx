import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  MapPinned,
  Navigation,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";

const MARKET_STORAGE_KEY = "agri-feed-market-module-v3";
const PRICE_TYPE_OPTIONS = ["Wholesale", "Retail", "Farm Gate"];
const TIMEFRAME_OPTIONS = ["30D", "90D", "6M"];
const CROP_OPTIONS = [
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
    farmName: "Primary Market Plot",
    name: "Primary Market Plot",
    district: "Kicukiro District",
    province: "Kigali City",
    primaryCrop: "Beans",
    latitude: -1.9838,
    longitude: 30.1014,
  };
}

function formatRwf(value) {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return `RWF ${Math.round(Number(value)).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getTrendLabel(change) {
  if (change == null) return "No history";
  if (change >= 7) return "Rising Fast";
  if (change >= 2) return "Rising";
  if (change <= -6) return "Falling";
  return "Stable";
}

function normalizeCropSelection(value) {
  if (value === "Maize" || value === "Hybrid Corn") return "Corn";
  if (value === "Bush Beans" || value === "Climbing Beans") return "Beans";
  if (value === "Potato" || value === "Potatoes") return "Irish Potato";
  if (value === "Groundnut" || value === "Peanut" || value === "Peanuts") return "Groundnuts";
  if (value === "Green Banana" || value === "Matoke") return "Banana";
  return CROP_OPTIONS.includes(value) ? value : "Beans";
}

function dedupeLatestPrices(records) {
  const latest = new Map();
  for (const record of records) {
    const key = `${record.marketName}||${record.district}`;
    if (!latest.has(key)) {
      latest.set(key, record);
    }
  }
  return [...latest.values()];
}

function getPriceField(priceType) {
  if (priceType === "Retail") return "retailPrice";
  if (priceType === "Farm Gate") return "farmGatePrice";
  return "wholesalePrice";
}

function buildFallbackRanking(records, priceType) {
  const priceField = getPriceField(priceType);
  return records
    .filter((record) => record[priceField] != null)
    .map((record) => ({
      id: `${record.id}-${priceType}`,
      name: record.marketName,
      district: record.district,
      currentPrice: Number(record[priceField]),
      currentPriceLabel: `${formatRwf(record[priceField])} / ${record.unit || "kg"}`,
      demandLabel: "Official price",
      trendLabel: getTrendLabel(record.previousPrice != null && Number(record.previousPrice) > 0 ? (((Number(record[priceField]) - Number(record.previousPrice)) / Number(record.previousPrice)) * 100) : null),
      accessibilityLabel: "Backend record",
      opportunityScore: Math.round(Math.min(100, Number(record[priceField]) / 20 + 45)),
      recommendation: "Official Price",
      updatedAt: record.updatedAt,
      coordinates: { lat: Number(record.latitude || -1.9838), lng: Number(record.longitude || 30.1014) },
    }))
    .sort((a, b) => b.currentPrice - a.currentPrice);
}

function getDemandTone(label) {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium") || normalized.includes("moderate") || normalized.includes("mid")) return "mid";
  if (normalized.includes("low")) return "low";
  return "neutral";
}

function getTrendTone(label) {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("fall") || normalized.includes("down")) return "down";
  if (normalized.includes("rise") || normalized.includes("up")) return "up";
  return "flat";
}

function formatChange(change) {
  if (change == null || Number.isNaN(Number(change))) return "--";
  const numeric = Number(change);
  return `${numeric >= 0 ? "+" : ""}${numeric}%`;
}

function formatPriceLabel(row, fallbackUnit = "kg") {
  if (!row) return "--";
  if (row.currentPriceLabel) return row.currentPriceLabel;
  return `${formatRwf(row.currentPrice)} / ${row.unit || fallbackUnit}`;
}

export function MarketPage() {
  const { currentFarms } = useFarmerData();
  const stored = useMemo(() => loadStoredState(), []);
  const farms = currentFarms?.length ? currentFarms : [createDefaultFarm()];
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "market-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(normalizeCropSelection(stored.selectedCrop || farms[0]?.primaryCrop || "Beans"));
  const [selectedMarket, setSelectedMarket] = useState(stored.selectedMarket || "");
  const [priceType, setPriceType] = useState(stored.priceType || "Wholesale");
  const [timeframe, setTimeframe] = useState(stored.timeframe || "30D");
  const [targetPrice, setTargetPrice] = useState(stored.targetPrice || "750");
  const [alerts, setAlerts] = useState(stored.alerts || []);
  const [officialRecords, setOfficialRecords] = useState([]);
  const [officialCurrentPrice, setOfficialCurrentPrice] = useState(null);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [backendAlerts, setBackendAlerts] = useState([]);
  const [state, setState] = useState({ loading: false, notice: "", source: "Official Backend Price" });

  useEffect(() => {
    saveStoredState({ selectedCrop, selectedMarket, priceType, timeframe, targetPrice, alerts });
  }, [selectedCrop, selectedMarket, priceType, timeframe, targetPrice, alerts]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "market-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(() => farms.find((farm) => farm.id === selectedFarmId) || farms[0] || null, [farms, selectedFarmId]);
  const backendFarmId = selectedFarm?.backendFarmId || selectedFarm?.id || "";
  const backendMode = isBackendSessionActive() && Boolean(backendFarmId);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await phase1BackendService.cropPrices.list({ cropName: selectedCrop, status: "Active" });
        if (cancelled) return;
        const latest = dedupeLatestPrices(Array.isArray(records) ? records : []);
        setOfficialRecords(latest);
        if (!selectedMarket || !latest.some((record) => record.marketName === selectedMarket)) {
          const districtMatch = latest.find((record) => record.district === selectedFarm?.district);
          setSelectedMarket(districtMatch?.marketName || latest[0]?.marketName || "");
        }
      } catch (error) {
        if (!cancelled) {
          setOfficialRecords([]);
          setSelectedMarket("");
          setState((current) => ({ ...current, notice: error?.message || "Failed to load official crop prices." }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCrop, selectedFarm?.district, selectedMarket]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCrop || !selectedMarket) {
      setOfficialCurrentPrice(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const current = await phase1BackendService.cropPrices.currentPrice({
          crop: selectedCrop,
          market: selectedMarket,
          district: selectedFarm?.district,
          priceType,
        });
        if (!cancelled) setOfficialCurrentPrice(current);
      } catch (error) {
        if (!cancelled) {
          setOfficialCurrentPrice(null);
          setState((current) => ({ ...current, notice: error?.message || `No official ${priceType.toLowerCase()} price exists yet for ${selectedCrop} at ${selectedMarket}.` }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedCrop, selectedMarket, selectedFarm?.district, priceType]);

  useEffect(() => {
    let cancelled = false;
    if (!backendMode || !backendFarmId || !selectedCrop || !selectedMarket) {
      setMarketAnalysis(null);
      setBackendAlerts([]);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        setState({ loading: true, notice: "Loading official market analysis...", source: "Official Backend Price" });
        const [analysis, alertList] = await Promise.all([
          phase1BackendService.market.latest(backendFarmId, {
            crop: selectedCrop,
            timeframe,
            priceType,
            marketName: selectedMarket,
            district: selectedFarm?.district,
          }),
          phase1BackendService.market.listAlerts(backendFarmId),
        ]);
        if (cancelled) return;
        setMarketAnalysis(analysis || null);
        setBackendAlerts(Array.isArray(alertList) ? alertList : []);
        setState({
          loading: false,
          notice: analysis
            ? "Official price loaded from Market Officer records. Forecasts and rankings are derived from backend analysis."
            : "Official price loaded. Advanced market analysis is not available yet.",
          source: analysis ? "Official Backend Price + Analysis" : "Official Backend Price",
        });
      } catch (error) {
        if (cancelled) return;
        setMarketAnalysis(null);
        setBackendAlerts([]);
        setState({
          loading: false,
          notice: officialCurrentPrice
            ? "Official price loaded. Advanced market analysis is unavailable right now."
            : error?.message || "Unable to load backend market analysis.",
          source: "Official Backend Price",
        });
      }
    })();

    return () => { cancelled = true; };
  }, [backendMode, backendFarmId, selectedCrop, selectedMarket, priceType, timeframe, selectedFarm?.district, officialCurrentPrice]);

  const marketOptions = useMemo(() => officialRecords.map((record) => record.marketName), [officialRecords]);
  const rankingRows = useMemo(() => {
    if (Array.isArray(marketAnalysis?.markets) && marketAnalysis.markets.length) return marketAnalysis.markets;
    return buildFallbackRanking(officialRecords, priceType);
  }, [marketAnalysis, officialRecords, priceType]);
  const visibleAlerts = backendMode ? backendAlerts : alerts;
  const bestMarket = marketAnalysis?.bestMarket || rankingRows[0] || null;
  const forecastRows = Array.isArray(marketAnalysis?.forecasts) ? marketAnalysis.forecasts : [];
  const selectedMarketRow = useMemo(
    () => rankingRows.find((row) => row.name === selectedMarket) || bestMarket || null,
    [bestMarket, rankingRows, selectedMarket]
  );
  const forecastConfidence = useMemo(() => {
    if (!forecastRows.length) return null;
    const total = forecastRows.reduce((sum, forecast) => sum + Number(forecast.confidence || 0), 0);
    return Math.round(total / forecastRows.length);
  }, [forecastRows]);
  const currentPriceUnit = officialCurrentPrice?.unit || officialRecords[0]?.unit || "kg";
  const alertDisabled = !officialCurrentPrice || Number(targetPrice) <= 0;

  const createAlert = async () => {
    const numericTarget = Number(targetPrice);
    if (!numericTarget || !officialCurrentPrice) return;

    const localAlert = {
      id: `${selectedFarmId}-${selectedCrop}-${priceType}-${numericTarget}`,
      crop: selectedCrop,
      targetPrice: Math.round(numericTarget),
      currentPrice: officialCurrentPrice.currentPrice,
      createdAt: new Date().toISOString(),
      status: numericTarget <= officialCurrentPrice.currentPrice ? "Target reached" : "Monitoring",
    };

    if (backendMode && backendFarmId) {
      try {
        const created = await phase1BackendService.market.createAlert(backendFarmId, {
          crop: selectedCrop,
          targetPrice: Math.round(numericTarget),
          currentPrice: officialCurrentPrice.currentPrice,
          bestMarketName: bestMarket?.name || officialCurrentPrice.market,
          status: localAlert.status,
        });
        setBackendAlerts((current) => [created, ...current]);
        return;
      } catch {
        // Fall back to local alert state if backend alert creation fails.
      }
    }

    setAlerts((current) => [localAlert, ...current]);
  };

  return (
    <PageShell maxWidth="1380px" className="market-intelligence-page">
      <PageHeader
        title="Market Intelligence"
        subtitle="Official crop prices from Market Officers, with backend analysis layered on top for forecasts, ranking, and selling guidance."
        actions={<StatusBadge variant="success">{state.source}</StatusBadge>}
      />

      <AppCard className="mk-hero-card" padding={false}>
        <div className="mk-hero-top">
          <div className="mk-hero-copy">
            <span className="mk-hero-eyebrow">Official market intelligence</span>
            <h2>Track the current official price, compare nearby markets, and plan where to sell.</h2>
            <p>
              The values below come from the same Market Officer price records stored in MySQL. Forecasts and recommendations are clearly separated from the official current price.
            </p>
          </div>
          <div className="mk-hero-stats">
            <div className="mk-hero-stat">
              <span>Selected Crop</span>
              <strong>{selectedCrop}</strong>
            </div>
            <div className="mk-hero-stat">
              <span>Tracked Markets</span>
              <strong>{rankingRows.length || 0}</strong>
            </div>
            <div className="mk-hero-stat">
              <span>Current Price Type</span>
              <strong>{priceType}</strong>
            </div>
          </div>
        </div>
        <div className="mk-filter-bar mk-filter-bar-hero">
          <div className="mk-filter-left">
            <label className="mk-filter-field">
              <span className="mk-filter-label">Farm</span>
              <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>{farm.name || farm.farmName}</option>
                ))}
              </select>
            </label>
            <label className="mk-filter-field">
              <span className="mk-filter-label">Crop</span>
              <select value={selectedCrop} onChange={(event) => setSelectedCrop(event.target.value)}>
                {CROP_OPTIONS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
              </select>
            </label>
            <label className="mk-filter-field">
              <span className="mk-filter-label">Market</span>
              <select value={selectedMarket} onChange={(event) => setSelectedMarket(event.target.value)}>
                {marketOptions.map((market) => <option key={market} value={market}>{market}</option>)}
              </select>
            </label>
            <label className="mk-filter-field">
              <span className="mk-filter-label">Price Type</span>
              <select value={priceType} onChange={(event) => setPriceType(event.target.value)}>
                {PRICE_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="mk-filter-field">
              <span className="mk-filter-label">Forecast Window</span>
              <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
                {TIMEFRAME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="mk-filter-right">
            <div className="mk-context-chips">
              <span className="mk-context-chip">{selectedFarm?.district || "District unavailable"}</span>
              <span className="mk-context-chip">{selectedMarket || "No market selected"}</span>
              <span className="mk-context-chip">{backendMode ? "Backend session active" : "Backend session unavailable"}</span>
            </div>
          </div>
        </div>
      </AppCard>

      {(state.notice || state.loading) ? (
        <div className={`mk-notice ${state.loading ? "loading" : ""}`}>
          <span className="mk-notice-dot" />
          <span>{state.loading ? "Loading official market analysis..." : state.notice}</span>
        </div>
      ) : null}

      <div className="mk-kpi-grid">
        <div className="mk-kpi-card">
          <div className="mk-kpi-icon green"><DollarSign size={18} /></div>
          <div className="mk-kpi-body">
            <span className="mk-kpi-label">Current Official Price</span>
            <strong className="mk-kpi-value">{formatRwf(officialCurrentPrice?.currentPrice)}</strong>
            <span className="mk-kpi-sub">{officialCurrentPrice ? `${officialCurrentPrice.priceType} | ${officialCurrentPrice.market}` : "No official price selected"}</span>
          </div>
          <span className={`mk-kpi-trend ${Number(officialCurrentPrice?.percentageChange) < 0 ? "down" : "up"}`}>
            {formatChange(officialCurrentPrice?.percentageChange)}
          </span>
        </div>

        <div className="mk-kpi-card">
          <div className="mk-kpi-icon blue"><Clock size={18} /></div>
          <div className="mk-kpi-body">
            <span className="mk-kpi-label">Previous Official Price</span>
            <strong className="mk-kpi-value">{formatRwf(officialCurrentPrice?.previousPrice)}</strong>
            <span className="mk-kpi-sub">{officialCurrentPrice ? `Effective ${formatDate(officialCurrentPrice.effectiveDate)}` : "No previous record"}</span>
          </div>
        </div>

        <div className="mk-kpi-card">
          <div className="mk-kpi-icon amber"><MapPinned size={18} /></div>
          <div className="mk-kpi-body">
            <span className="mk-kpi-label">Best Market Right Now</span>
            <strong className="mk-kpi-value">{bestMarket?.name || "--"}</strong>
            <span className="mk-kpi-sub">{bestMarket ? formatPriceLabel(bestMarket, currentPriceUnit) : "No ranked market available"}</span>
          </div>
        </div>

        <div className="mk-kpi-card">
          <div className="mk-kpi-icon purple"><BarChart3 size={18} /></div>
          <div className="mk-kpi-body">
            <span className="mk-kpi-label">Forecast Confidence</span>
            <strong className="mk-kpi-value">{forecastConfidence != null ? `${forecastConfidence}%` : "--"}</strong>
            <span className="mk-kpi-sub">{forecastRows.length ? `${forecastRows.length} forecast points from backend analysis` : "Analysis unavailable"}</span>
          </div>
        </div>
      </div>

      <div className="mk-main-layout">
        <div className="mk-main-left">
          <AppCard className="mk-price-card">
            <div className="mk-card-head mk-card-head-split">
              <div>
                <div className="mk-card-title-row">
                  <DollarSign size={18} />
                  <h3>Official Price Overview</h3>
                </div>
                <span className="mk-card-subtitle">This is the current official price from Market Officer records, not a generated estimate.</span>
              </div>
              <StatusBadge variant="success">MySQL source</StatusBadge>
            </div>

            {officialCurrentPrice ? (
              <div className="mk-price-overview">
                <div className="mk-price-spotlight">
                  <span className="mk-price-spotlight-label">Current official {priceType.toLowerCase()} price</span>
                  <strong className="mk-price-spotlight-value">{formatRwf(officialCurrentPrice.currentPrice)}</strong>
                  <span className="mk-price-spotlight-unit">per {officialCurrentPrice.unit}</span>
                  <div className="mk-price-change-row">
                    <StatusBadge variant={Number(officialCurrentPrice.percentageChange) < 0 ? "red" : "success"}>
                      {formatChange(officialCurrentPrice.percentageChange)} vs previous official price
                    </StatusBadge>
                    <span className="mk-price-update-meta">Updated by {officialCurrentPrice.updatedBy || "--"} on {formatDate(officialCurrentPrice.effectiveDate)}</span>
                  </div>
                </div>

                <div className="mk-price-detail-grid">
                  <div className="mk-price-detail-item"><span>Crop</span><strong>{officialCurrentPrice.crop}</strong></div>
                  <div className="mk-price-detail-item"><span>Market</span><strong>{officialCurrentPrice.market}</strong></div>
                  <div className="mk-price-detail-item"><span>District</span><strong>{officialCurrentPrice.district}</strong></div>
                  <div className="mk-price-detail-item"><span>Price Type</span><strong>{officialCurrentPrice.priceType}</strong></div>
                  <div className="mk-price-detail-item"><span>Previous Price</span><strong>{formatRwf(officialCurrentPrice.previousPrice)}</strong></div>
                  <div className="mk-price-detail-item"><span>Change</span><strong>{formatChange(officialCurrentPrice.percentageChange)}</strong></div>
                  <div className="mk-price-detail-item"><span>Effective Date</span><strong>{formatDate(officialCurrentPrice.effectiveDate)}</strong></div>
                  <div className="mk-price-detail-item"><span>Updated By</span><strong>{officialCurrentPrice.updatedBy || "--"}</strong></div>
                </div>
              </div>
            ) : (
              <p className="mk-empty">No official price exists yet for the selected crop, market, and price type.</p>
            )}
          </AppCard>
          <AppCard>
            <div className="mk-card-head mk-card-head-split">
              <div>
                <div className="mk-card-title-row">
                  <MapPinned size={18} />
                  <h3>Nearby Markets and Official Prices</h3>
                </div>
                <span className="mk-card-subtitle">Compare nearby markets using the latest official {priceType.toLowerCase()} prices.</span>
              </div>
              <StatusBadge variant="default">{rankingRows.length} markets tracked</StatusBadge>
            </div>

            {rankingRows.length ? (
              <>
                <div className="mk-ranking-summary">
                  <p>
                    {bestMarket
                      ? `${bestMarket.name} currently offers the strongest visible official price for ${selectedCrop}.`
                      : `Official prices are available for ${rankingRows.length} markets.`}
                  </p>
                </div>
                <div className="mk-ranking-wrap">
                  <div className="mk-ranking-head mk-ranking-head-compact">
                    <span className="mk-r-col-rank">#</span>
                    <span className="mk-r-col-market">Market</span>
                    <span className="mk-r-col-price">Official Price</span>
                    <span className="mk-r-col-demand">Demand</span>
                    <span className="mk-r-col-trend">Trend</span>
                    <span className="mk-r-col-score">Score</span>
                  </div>
                  {rankingRows.map((row, index) => {
                    const demandTone = getDemandTone(row.demandLabel);
                    const trendTone = getTrendTone(row.trendLabel);
                    const isSelected = row.name === selectedMarket;
                    return (
                      <div key={row.id || `${row.name}-${index}`} className={`mk-ranking-row mk-ranking-row-compact ${index === 0 ? "best" : ""} ${isSelected ? "selected" : ""}`}>
                        <span className="mk-r-col-rank">{index + 1}</span>
                        <div className="mk-r-col-market mk-r-market-info-wrap">
                          <div className="mk-r-market-info">
                            <div className="mk-r-market-title-row">
                              <strong>{row.name}</strong>
                              {index === 0 ? <span className="mk-best-badge">Best price</span> : null}
                              {isSelected ? <span className="mk-selected-badge">Selected</span> : null}
                            </div>
                            <span className="mk-r-market-district">{row.district || "District unavailable"}</span>
                            <span className="mk-r-market-meta">Updated {formatDate(row.updatedAt || officialCurrentPrice?.effectiveDate)}</span>
                          </div>
                        </div>
                        <strong className="mk-r-col-price">{formatPriceLabel(row, currentPriceUnit)}</strong>
                        <span className={`mk-r-col-demand ${demandTone}`}>{row.demandLabel || "Official price"}</span>
                        <span className={`mk-r-col-trend ${trendTone}`}>{row.trendLabel || "--"}</span>
                        <span className="mk-r-col-score">{row.opportunityScore || "--"}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mk-empty">No official market prices are available for the selected crop.</p>
            )}
          </AppCard>

          <AppCard>
            <div className="mk-card-head mk-card-head-split">
              <div>
                <div className="mk-card-title-row">
                  <Clock size={18} />
                  <h3>Forecast Outlook</h3>
                </div>
                <span className="mk-card-subtitle">Forecasted values start from the current official price and remain clearly labeled as projections.</span>
              </div>
              <StatusBadge variant="default">{timeframe}</StatusBadge>
            </div>
            {forecastRows.length ? (
              <div className="mk-forecast-grid">
                {forecastRows.map((forecast) => (
                  <div key={forecast.label} className="mk-forecast-card">
                    <div className="mk-fc-head">
                      <span className="mk-fc-label">{forecast.label}</span>
                      <div className={`mk-fc-change ${forecast.forecastChange >= 0 ? "up" : "down"}`}>
                        {forecast.forecastChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <span>{forecast.forecastChange >= 0 ? "+" : ""}{forecast.forecastChange}%</span>
                      </div>
                    </div>
                    <div className="mk-fc-prices">
                      <div className="mk-fc-current">
                        <span className="mk-fc-pricelabel">Official now</span>
                        <strong>{formatRwf(forecast.currentPrice)}</strong>
                      </div>
                      <div className="mk-fc-predicted">
                        <span className="mk-fc-pricelabel">Forecast</span>
                        <strong>{formatRwf(forecast.predictedPrice)}</strong>
                      </div>
                    </div>
                    <div className="mk-fc-footer">
                      <span className="mk-fc-confidence">{forecast.confidence}% confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mk-empty">Forecasting is unavailable until backend analysis runs for the selected crop and market.</p>
            )}
          </AppCard>
        </div>

        <div className="mk-main-right">
          <div className="mk-ai-card">
            <div className="mk-ai-head">
              <Bot size={18} />
              <div>
                <h3>AI Selling Recommendation</h3>
                <span>Recommendation text is separate from the official price record.</span>
              </div>
            </div>
            {marketAnalysis ? (
              <div className="mk-ai-body">
                <div className="mk-ai-decision-row">
                  <span className="mk-ai-label">Recommended Action</span>
                  <strong className="mk-ai-decision">{marketAnalysis.aiDecision}</strong>
                </div>
                <div className="mk-ai-row"><Store size={14} /><span>Best market: <strong>{bestMarket?.name || "--"}</strong></span></div>
                <div className="mk-ai-row"><DollarSign size={14} /><span>Official price: <strong>{formatRwf(officialCurrentPrice?.currentPrice)}</strong></span></div>
                <p className="mk-ai-reason">{marketAnalysis.aiReason}</p>
                <div className="mk-ai-conf-section">
                  <div className="mk-ai-conf-top"><span>AI Confidence</span><strong>{marketAnalysis.aiConfidence}%</strong></div>
                  <div className="mk-ai-conf-track">
                    <div className="mk-ai-conf-fill" style={{ width: `${marketAnalysis.aiConfidence}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mk-ai-body">
                <div className="mk-ai-decision-row">
                  <span className="mk-ai-label">Current Status</span>
                  <strong className="mk-ai-decision">Official price available</strong>
                </div>
                <p className="mk-ai-reason">Advanced recommendation text is not available yet, but the current official price and nearby market ranking are still live from the backend.</p>
              </div>
            )}
          </div>

          <AppCard>
            <div className="mk-card-head mk-card-head-split">
              <div>
                <div className="mk-card-title-row">
                  <Navigation size={18} />
                  <h3>Market Snapshot</h3>
                </div>
                <span className="mk-card-subtitle">Quick context for the selected market and district.</span>
              </div>
            </div>
            <div className="mk-summary-stack">
              <div className="mk-summary-row"><span>Selected market</span><strong>{selectedMarketRow?.name || selectedMarket || "--"}</strong></div>
              <div className="mk-summary-row"><span>District</span><strong>{selectedMarketRow?.district || selectedFarm?.district || "--"}</strong></div>
              <div className="mk-summary-row"><span>Visible official price</span><strong>{selectedMarketRow ? formatPriceLabel(selectedMarketRow, currentPriceUnit) : "--"}</strong></div>
              <div className="mk-summary-row"><span>Tracked markets</span><strong>{rankingRows.length || 0}</strong></div>
              <div className="mk-summary-row"><span>Price type</span><strong>{priceType}</strong></div>
            </div>
          </AppCard>

          <AppCard>
            <div className="mk-card-head mk-card-head-split">
              <div>
                <div className="mk-card-title-row">
                  <Bell size={18} />
                  <h3>Price Alerts</h3>
                </div>
                <span className="mk-card-subtitle">Set a target and monitor when the official price reaches it.</span>
              </div>
            </div>
            <div className="mk-alert-create-row">
              <input
                className="mk-alert-input"
                type="number"
                min="1"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                placeholder="Target price in RWF"
              />
              <ActionButton onClick={createAlert} disabled={alertDisabled}>Create Alert</ActionButton>
            </div>
            <div className="mk-alerts-list">
              {visibleAlerts.length ? visibleAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="mk-alert-item">
                  <div className="mk-alert-top"><strong>{alert.crop}</strong><StatusBadge variant={alert.status === "Target reached" ? "success" : "default"}>{alert.status}</StatusBadge></div>
                  <div className="mk-alert-details"><span>Target: {formatRwf(alert.targetPrice)}</span><span>Current: {formatRwf(alert.currentPrice)}</span></div>
                  <small>{formatDate(alert.createdAt)}</small>
                </div>
              )) : <p className="mk-empty">No price alerts yet.</p>}
            </div>
          </AppCard>

          {(marketAnalysis?.platforms || []).length ? (
            <AppCard>
              <div className="mk-card-head mk-card-head-split">
                <div>
                  <div className="mk-card-title-row">
                    <Globe size={18} />
                    <h3>Market Platforms</h3>
                  </div>
                  <span className="mk-card-subtitle">Useful channels for additional market monitoring.</span>
                </div>
              </div>
              <div className="mk-platforms-list">
                {(marketAnalysis?.platforms || []).map((platform) => (
                  <a key={platform.title} href={platform.href} target="_blank" rel="noreferrer" className="mk-platform-card">
                    <div className="mk-platform-body"><strong>{platform.title}</strong><span>{platform.description}</span></div>
                    <ExternalLink size={14} className="mk-platform-icon" />
                  </a>
                ))}
              </div>
            </AppCard>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}


