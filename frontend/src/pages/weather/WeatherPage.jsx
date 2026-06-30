import {
  AlertTriangle,
  CalendarDays,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  Leaf,
  MapPin,
  ShieldAlert,
  Sprout,
  Sun,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiClient,
  buildOpenMeteoArchiveUrl,
  buildOpenMeteoForecastUrl,
} from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { useFarmerData } from "../../context/FarmerDataContext";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { MetricCard } from "../../components/common/MetricCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";

const WEATHER_CODE_MAP = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
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

const RANGE_OPTIONS = ["1M", "6M", "1Y"];
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 220;

function getWeatherDescription(code) {
  return WEATHER_CODE_MAP[code] || "Partly cloudy";
}

function getWeatherIcon(code, size = 28) {
  if (code === 0) return <Sun size={size} />;
  if (code === 1 || code === 2) return <CloudSun size={size} />;
  if (code === 3) return <Cloud size={size} />;
  if (code === 45 || code === 48) return <CloudFog size={size} />;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain size={size} />;
  if (code === 95) return <AlertTriangle size={size} />;
  return <CloudSun size={size} />;
}

function formatDayLabel(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function formatShortDate(dateString) {
  const today = new Date();
  const target = new Date(dateString);
  const isToday = today.toDateString() === target.toDateString();
  if (isToday) {
    return "Today";
  }
  return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSameCalendarDay(dateString) {
  return new Date(dateString).toDateString() === new Date().toDateString();
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString("en-RW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateRange(range) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  const daysBack = range === "1Y" ? 365 : range === "6M" ? 183 : 30;
  start.setDate(end.getDate() - daysBack);

  const toApiDate = (date) => date.toISOString().slice(0, 10);

  return {
    startDate: toApiDate(start),
    endDate: toApiDate(end),
  };
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildTrendPath(values, width, height, paddingY = 16) {
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - paddingY * 2) - paddingY;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(values, width, height, paddingY = 16) {
  const linePath = buildTrendPath(values, width, height, paddingY);
  if (!linePath) return "";
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

function summarizeTrend(values) {
  if (values.length < 2) {
    return "Stable";
  }
  const delta = values[values.length - 1] - values[0];
  if (delta > 2) return "Rising";
  if (delta < -2) return "Cooling";
  return "Stable";
}

function buildAlerts(days) {
  const alerts = [];
  const totalRain = days.reduce((sum, day) => sum + day.rainSum, 0);

  const heavyRainDay = days.find((day) => day.rainSum >= 30);
  if (heavyRainDay) {
    alerts.push({
      id: `rain-${heavyRainDay.date}`,
      level: "high",
      title: "Heavy Rain Alert",
      body: `${formatShortDate(heavyRainDay.date)} is forecast to receive ${heavyRainDay.rainSum.toFixed(1)} mm of rain.`,
    });
  }

  const heatwaveDay = days.find((day) => day.maxTemp >= 32);
  if (heatwaveDay) {
    alerts.push({
      id: `heat-${heatwaveDay.date}`,
      level: "high",
      title: "Heatwave Alert",
      body: `${formatShortDate(heatwaveDay.date)} is forecast to reach ${heatwaveDay.maxTemp.toFixed(1)}°C.`,
    });
  }

  if (totalRain < 10) {
    alerts.push({
      id: "drought-risk",
      level: "medium",
      title: "Drought Risk",
      body: `The next 7 days total only ${totalRain.toFixed(1)} mm of rain, which is below the planting comfort range.`,
    });
  }

  const strongWindDay = days.find((day) => day.windMax >= 35);
  if (strongWindDay) {
    alerts.push({
      id: `wind-${strongWindDay.date}`,
      level: "medium",
      title: "Strong Wind Alert",
      body: `${formatShortDate(strongWindDay.date)} may see winds up to ${strongWindDay.windMax.toFixed(1)} km/h.`,
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "no-alert",
      level: "low",
      title: "No Alert",
      body: "No alert if none of these conditions are met.",
    });
  }

  return alerts;
}

function buildPlantingGuidance(days) {
  const totalRain = days.reduce((sum, day) => sum + day.rainSum, 0);
  const avgMax = days.reduce((sum, day) => sum + day.maxTemp, 0) / Math.max(days.length, 1);
  const summaryLabel = "Planting guidance generated from 7-day rainfall and temperature trends.";

  if (totalRain < 10) {
    return {
      label: summaryLabel,
      title: "Delay planting 10–14 days",
      detail: `Only ${totalRain.toFixed(1)} mm of rain is forecast. Soil moisture recharge is likely insufficient for safe establishment.`,
      seasonSignal: summarizeTrend(days.map((day) => day.maxTemp)),
      rainBand: "Low rainfall window",
      avgMax,
    };
  }

  if (totalRain <= 25) {
    return {
      label: summaryLabel,
      title: "Plant with moisture conservation",
      detail: `${totalRain.toFixed(1)} mm of rain is forecast. Planting is possible if mulching and moisture-retention practices are used.`,
      seasonSignal: summarizeTrend(days.map((day) => day.maxTemp)),
      rainBand: "Moderate rainfall window",
      avgMax,
    };
  }

  return {
    label: summaryLabel,
    title: "Suitable planting window",
    detail: `${totalRain.toFixed(1)} mm of rain is forecast across the next 7 days, supporting planting and early establishment.`,
    seasonSignal: summarizeTrend(days.map((day) => day.maxTemp)),
    rainBand: "Moist planting window",
    avgMax,
  };
}

function toForecastDays(daily) {
  return daily.time.map((date, index) => ({
    date,
    code: daily.weather_code[index],
    description: getWeatherDescription(daily.weather_code[index]),
    maxTemp: daily.temperature_2m_max[index],
    minTemp: daily.temperature_2m_min[index],
    precipitationProbability: daily.precipitation_probability_max[index] ?? 0,
    rainSum: daily.rain_sum[index] ?? 0,
    precipitationSum: daily.precipitation_sum[index] ?? 0,
    humidityMax: daily.relative_humidity_2m_max[index] ?? 0,
    windMax: daily.wind_speed_10m_max[index] ?? 0,
  }));
}

function toHistoricalSeries(archive) {
  return archive.daily.time.map((date, index) => {
    const max = archive.daily.temperature_2m_max[index] ?? 0;
    const min = archive.daily.temperature_2m_min[index] ?? 0;
    return {
      date,
      avgTemp: Number(((max + min) / 2).toFixed(1)),
      maxTemp: max,
      minTemp: min,
      precipitationSum: archive.daily.precipitation_sum[index] ?? 0,
    };
  });
}

function downsampleHistoricalSeries(points, maxPoints) {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampled = [];
  const step = (points.length - 1) / Math.max(maxPoints - 1, 1);

  for (let slot = 0; slot < maxPoints; slot += 1) {
    const index = Math.round(slot * step);
    sampled.push(points[index]);
  }

  return sampled;
}

function buildHistoricalAxisLabels(points, range) {
  if (!points.length) {
    return [];
  }

  const targetCount = range === "1Y" ? 6 : range === "6M" ? 6 : 7;
  const indexes = new Set([0, points.length - 1]);
  const step = Math.max(1, Math.floor((points.length - 1) / Math.max(targetCount - 1, 1)));

  for (let index = step; index < points.length - 1; index += step) {
    indexes.add(index);
  }

  const formatter =
    range === "1M"
      ? { month: "short", day: "numeric" }
      : { month: "short" };

  const uniqueLabels = new Set();

  return [...indexes]
    .sort((left, right) => left - right)
    .map((index) => {
      const label = new Date(points[index].date).toLocaleDateString("en-US", formatter);
      return {
        index,
        label,
        left: points.length > 1 ? (index / (points.length - 1)) * 100 : 0,
      };
    })
    .filter((item, index, array) => {
      if (range === "1M") {
        return true;
      }

      const isEdge = index === 0 || index === array.length - 1;
      if (isEdge && !uniqueLabels.has(item.label)) {
        uniqueLabels.add(item.label);
        return true;
      }

      if (uniqueLabels.has(item.label)) {
        return false;
      }

      uniqueLabels.add(item.label);
      return true;
    });
}

export function WeatherPage() {
  const { currentFarms, data } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : data.farms;
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [selectedRange, setSelectedRange] = useState("1M");
  const [forecastData, setForecastData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!selectedFarmId && farms[0]?.id) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0] || null,
    [farms, selectedFarmId]
  );
  const backendMode = isBackendSessionActive() && Boolean(selectedFarm?.id);

  useEffect(() => {
    if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
      setError("Unable to fetch weather data. Please check internet connection or coordinates.");
      setLoading(false);
      return;
    }

    const latitude = selectedFarm.location.lat;
    const longitude = selectedFarm.location.lng;
    const { startDate, endDate } = getDateRange(selectedRange);
    const forecastUrl = buildOpenMeteoForecastUrl(latitude, longitude);
    const historicalUrl = buildOpenMeteoArchiveUrl(latitude, longitude, startDate, endDate);

    let cancelled = false;
    setLoading(true);
    setError("");
    setWarning("");

    if (import.meta.env.DEV) {
      console.log("Selected coordinates:", { latitude, longitude, farm: selectedFarm.name });
      console.log("Forecast API URL:", forecastUrl);
      console.log("Historical API URL:", historicalUrl);
    }

    async function loadWeather() {
      let backendLoaded = false;

      if (backendMode) {
        try {
          const backendDashboard = await phase1BackendService.weather.dashboard(selectedFarm.id, {
            range: selectedRange,
          });

          if (cancelled) return;

          if (backendDashboard?.daily && import.meta.env.DEV) {
            console.log("Returned daily forecast arrays:", backendDashboard.daily);
          }

          setForecastData({
            current: backendDashboard?.current || null,
            daily: backendDashboard?.daily || null,
          });
          setHistoricalData(Array.isArray(backendDashboard?.historicalSeries) ? backendDashboard.historicalSeries : []);
          setWarning(backendDashboard?.warning || "");
          setLastUpdated(backendDashboard?.lastUpdated || formatTimestamp(new Date()));
          backendLoaded = Boolean(backendDashboard?.current);
        } catch (backendError) {
          if (import.meta.env.DEV) {
            console.error("[WeatherPage] backend weather load failed", backendError);
          }
        }
      }

      if (backendLoaded || cancelled) {
        return;
      }

      const results = await Promise.allSettled([
        apiClient.weather.forecast(latitude, longitude),
        apiClient.weather.archive(latitude, longitude, startDate, endDate),
      ]);

      if (cancelled) return;

      const [forecastResult, archiveResult] = results;

      if (forecastResult.status !== "fulfilled") {
        setError("Unable to fetch weather data. Please check internet connection or coordinates.");
        setForecastData(null);
        setHistoricalData([]);
        return;
      }

      if (import.meta.env.DEV) {
        console.log("Returned daily forecast arrays:", forecastResult.value.daily);
      }

      setForecastData(forecastResult.value);

      if (archiveResult.status === "fulfilled") {
        setHistoricalData(toHistoricalSeries(archiveResult.value));
      } else {
        setHistoricalData([]);
        setWarning("Historical climate trend could not be loaded right now. Live forecast data is still available.");
      }

      setLastUpdated(formatTimestamp(new Date()));
    }

    loadWeather()
      .catch(() => {
        if (!cancelled) {
          setError("Unable to fetch weather data. Please check internet connection or coordinates.");
          setForecastData(null);
          setHistoricalData([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [backendMode, selectedFarm, selectedRange]);

  const forecastDays = useMemo(
    () => (forecastData?.daily ? toForecastDays(forecastData.daily) : []),
    [forecastData]
  );

  const chartSeries = useMemo(() => {
    if (!historicalData.length) {
      return {
        points: [],
        tempValues: [],
        rainValues: [],
        areaPath: "",
        tempPath: "",
        rainPath: "",
        labels: [],
      };
    }

    const sampledPoints =
      selectedRange === "1M"
        ? historicalData
        : downsampleHistoricalSeries(historicalData, selectedRange === "6M" ? 24 : 28);

    const tempValues = sampledPoints.map((item) => item.avgTemp);
    const rainValues = sampledPoints.map((item) => item.precipitationSum);
    const labels = buildHistoricalAxisLabels(sampledPoints, selectedRange);

    return {
      points: sampledPoints,
      tempValues,
      rainValues,
      areaPath: buildAreaPath(tempValues, CHART_WIDTH, CHART_HEIGHT),
      tempPath: buildTrendPath(tempValues, CHART_WIDTH, CHART_HEIGHT),
      rainPath: buildTrendPath(rainValues, CHART_WIDTH, CHART_HEIGHT),
      labels,
    };
  }, [historicalData, selectedRange]);

  const currentWeather = forecastData?.current || null;
  const weatherAlerts = useMemo(() => buildAlerts(forecastDays), [forecastDays]);
  const plantingGuidance = useMemo(() => buildPlantingGuidance(forecastDays), [forecastDays]);
  const activeForecastIndex = useMemo(() => {
    const todayIndex = forecastDays.findIndex((day) => isSameCalendarDay(day.date));
    return todayIndex >= 0 ? todayIndex : 0;
  }, [forecastDays]);

  const sevenDayRainTotal = useMemo(
    () => forecastDays.reduce((sum, day) => sum + day.rainSum, 0),
    [forecastDays]
  );

  const droughtRisk = clampPercentage(Math.max(0, 100 - sevenDayRainTotal * 4));
  const soilMoistureIndicator = clampPercentage(Math.max(15, 100 - droughtRisk * 0.78));
  const evapotranspirationIndicator = currentWeather
    ? Number((Math.max(2.2, (currentWeather.wind_speed_10m || 0) / 6 + (currentWeather.temperature_2m || 0) / 8)).toFixed(1))
    : 0;

  const footerSource = "Source: Open-Meteo Live API";

  return (
    <PageShell>
      <PageHeader
        title="Weather & Climate Analysis"
        description="Live current conditions, 7-day forecast, planting guidance, and historical climate trends for each registered farm."
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <StatusBadge status="verified">Open-Meteo Live API</StatusBadge>
          <StatusBadge status="default">{lastUpdated ? `Updated ${lastUpdated}` : "Live"}</StatusBadge>
        </div>
      </PageHeader>

      <div className="prototype-weather-toolbar" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", padding: "0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "var(--card)", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <MapPin size={16} style={{ color: "var(--text-muted)" }} />
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)} style={{ border: "none", background: "transparent", fontFamily: "var(--font)", fontSize: "14px", outline: "none", cursor: "pointer", color: "var(--text-main)" }}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name} - {farm.region}</option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{selectedFarm?.location?.label || selectedFarm?.region || ""}</span>
      </div>

      {loading ? <div style={{ padding: "12px 16px", background: "var(--light-green)", borderRadius: "10px", color: "var(--primary-green)", fontWeight: 600 }}>Loading live weather data...</div> : null}
      {!loading && error ? <div style={{ padding: "12px 16px", background: "#FFEBEE", borderRadius: "10px", color: "var(--danger)", fontWeight: 500 }}>{error}</div> : null}
      {!loading && !error && warning ? <div style={{ padding: "12px 16px", background: "#FFF8E1", borderRadius: "10px", color: "#E65100", fontWeight: 500 }}>{warning}</div> : null}

      {!loading && !error && currentWeather ? (
        <>
          <div className="weather-page-hero">
            <div className="weather-hero-main">
              <div className="weather-hero-top">
                <div>
                  <div className="weather-hero-location"><MapPin size={16} />{selectedFarm?.name || "Farm"}</div>
                  <div className="weather-hero-condition" style={{ marginTop: "16px" }}>
                    <div className="weather-hero-icon-wrap">{getWeatherIcon(currentWeather.weather_code, 36)}</div>
                    <div>
                      <div className="weather-hero-temp">{Math.round(currentWeather.temperature_2m)}°C</div>
                      <div className="weather-hero-desc">{getWeatherDescription(currentWeather.weather_code)}</div>
                    </div>
                  </div>
                </div>
                <StatusBadge status="verified">Live Conditions</StatusBadge>
              </div>
              <div className="weather-hero-metrics">
                <div className="weather-hero-metric"><small>Feels Like</small><strong>{Math.round(currentWeather.temperature_2m - 2)}°C</strong></div>
                <div className="weather-hero-metric"><small>Rainfall</small><strong>{Number(currentWeather.rain || currentWeather.precipitation || 0).toFixed(1)} mm</strong></div>
                <div className="weather-hero-metric"><small>Humidity</small><strong>{Math.round(currentWeather.relative_humidity_2m)}%</strong></div>
                <div className="weather-hero-metric"><small>Wind</small><strong>{Math.round(currentWeather.wind_speed_10m)} km/h</strong></div>
                <div className="weather-hero-metric"><small>Pressure</small><strong>{Math.round(currentWeather.pressure_msl)} hPa</strong></div>
                <div className="weather-hero-metric"><small>UV Index</small><strong>{Math.round((currentWeather.temperature_2m || 0) / 8)}</strong></div>
              </div>
            </div>

            <div className="weather-hero-side">
              <div className="weather-alert-banner" style={weatherAlerts.some(a => a.level === "high") ? {} : {}}>
                <h4><ShieldAlert size={16} style={{ marginRight: 6 }} />Active Weather Alerts</h4>
                {weatherAlerts.length ? weatherAlerts.slice(0, 2).map(alert => (
                  <p key={alert.id} style={{ marginBottom: 4 }}><strong>{alert.title}:</strong> {alert.body}</p>
                )) : <p>No active weather alerts for this period.</p>}
              </div>
              <div className="weather-hero-insight">
                <h4><Sprout size={18} color="var(--primary-green)" />AI Planting Recommendation</h4>
                <p>{plantingGuidance.detail}</p>
                <div className={`weather-planting-badge ${plantingGuidance.title.includes("Delay") ? "delay" : plantingGuidance.title.includes("conservation") ? "caution" : "good"}`}>
                  {plantingGuidance.title}
                </div>
              </div>
            </div>
          </div>

          <AppCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarDays size={20} color="var(--primary-green)" /> 7-Day Forecast
              </h3>
              <div className="market-chart-tabs">
                {RANGE_OPTIONS.map((range) => (
                  <button key={range} type="button" className={selectedRange === range ? "active" : ""} onClick={() => setSelectedRange(range)}>{range}</button>
                ))}
              </div>
            </div>
            <div className="weather-forecast-strip">
              {forecastDays.map((day, index) => (
                <div key={day.date} className={`weather-forecast-day-card ${index === activeForecastIndex ? "today" : ""}`}>
                  <div className="day-name">{formatDayLabel(day.date)}</div>
                  <div className="day-date">{formatShortDate(day.date)}</div>
                  <div className="day-icon">{getWeatherIcon(day.code, 24)}</div>
                  <div className="day-temp">{Math.round(day.maxTemp)}°</div>
                  <div className="day-meta">
                    <span>Rain: {day.rainSum.toFixed(1)}mm</span>
                    <span>Chance: {Math.round(day.precipitationProbability)}%</span>
                    <span>Humidity: {Math.round(day.humidityMax)}%</span>
                    <span>Wind: {Math.round(day.windMax)} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>

          <div className="weather-charts-grid">
            <div className="weather-chart-card">
              <div className="chart-head">
                <h3>Rainfall Trend</h3>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{sevenDayRainTotal.toFixed(1)} mm total</span>
              </div>
              <div className="chart-body">
                <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" style={{ width: "100%", height: "180px" }}>
                  <path d={chartSeries.areaPath} fill="rgba(46, 125, 50, 0.15)" />
                  <path d={chartSeries.rainPath} fill="none" stroke="var(--primary-green)" strokeWidth="2" />
                </svg>
              </div>
            </div>
            <div className="weather-chart-card">
              <div className="chart-head">
                <h3>Temperature Trend</h3>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{plantingGuidance.seasonSignal}</span>
              </div>
              <div className="chart-body">
                <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" style={{ width: "100%", height: "180px" }}>
                  <path d={chartSeries.areaPath} fill="rgba(249, 168, 37, 0.12)" />
                  <path d={chartSeries.tempPath} fill="none" stroke="var(--warning)" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="weather-insights-grid">
            <div className="weather-insight-card">
              <div className="insight-icon"><Sprout size={24} /></div>
              <strong>Best Planting Day</strong>
              <p>{forecastDays.find(d => d.rainSum >= 3 && d.rainSum <= 15 && d.maxTemp >= 18 && d.maxTemp <= 30) ? formatShortDate(forecastDays.find(d => d.rainSum >= 3 && d.rainSum <= 15 && d.maxTemp >= 18 && d.maxTemp <= 30).date) : "Monitor conditions"}</p>
            </div>
            <div className="weather-insight-card">
              <div className="insight-icon"><AlertTriangle size={24} /></div>
              <strong>Harvest Warning</strong>
              <p>{weatherAlerts.some(a => a.level === "high") ? "Adverse weather expected - prepare protection" : "No harvest risk in forecast window"}</p>
            </div>
            <div className="weather-insight-card">
              <div className="insight-icon"><Droplets size={24} /></div>
              <strong>Irrigation Need</strong>
              <p>{sevenDayRainTotal < 15 ? `${Math.round((15 - sevenDayRainTotal) * 10)} L/m² supplemental water recommended` : "Sufficient rainfall expected"}</p>
            </div>
            <div className="weather-insight-card">
              <div className="insight-icon"><Leaf size={24} /></div>
              <strong>Fertilizer Timing</strong>
              <p>{forecastDays.some(d => d.rainSum >= 5) ? "Apply after next rainfall for soil incorporation" : "Dry window - irrigate before application"}</p>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}

