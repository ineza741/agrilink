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
    <section className="prototype-weather-detail-page">
      <div className="prototype-weather-module">
        <div className="prototype-weather-toolbar">
          <div className="page-title-block">
            <h1>Weather & Climate Analysis</h1>
            <p>Live current conditions, 7-day forecast, planting guidance, and historical climate trends for each registered farm.</p>
          </div>

          <div className="prototype-weather-toolbar-actions">
            <label className="prototype-weather-location-picker">
              <span>Active Farm</span>
              <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} - {farm.region}
                  </option>
                ))}
              </select>
            </label>

            <div className="prototype-weather-source-note">
              <MapPin size={16} />
              <span>{selectedFarm?.location?.label || selectedFarm?.region || "No farm location selected"}</span>
            </div>
          </div>
        </div>

        {loading ? <div className="prototype-weather-status">Loading live Open-Meteo weather data…</div> : null}
        {!loading && error ? (
          <div className="prototype-weather-status error">
            Unable to fetch weather data. Please check internet connection or coordinates.
          </div>
        ) : null}
        {!loading && !error && warning ? <div className="prototype-weather-status warning">{warning}</div> : null}

        {!loading && !error && currentWeather ? (
          <>
            <div className="prototype-weather-grid">
              <article className="prototype-panel weather-current-card">
                <div className="weather-current-head">
                  <div>
                    <span className="weather-live-badge">Live Conditions</span>
                    <h2>{getWeatherDescription(currentWeather.weather_code)}</h2>
                    <div className="weather-current-temp">
                      {getWeatherIcon(currentWeather.weather_code, 34)}
                      <strong>{Math.round(currentWeather.temperature_2m)}°C</strong>
                    </div>
                  </div>
                  <div className="weather-footer-meta">
                    <span>{footerSource}</span>
                    <strong>Last updated: {lastUpdated}</strong>
                  </div>
                </div>

                <div className="weather-current-metrics">
                  <div>
                    <span>
                      <Droplets size={15} />
                      Humidity
                    </span>
                    <strong>{Math.round(currentWeather.relative_humidity_2m)}%</strong>
                  </div>
                  <div>
                    <span>
                      <CloudRain size={15} />
                      Rain now
                    </span>
                    <strong>{Number(currentWeather.rain || currentWeather.precipitation || 0).toFixed(1)} mm</strong>
                  </div>
                  <div>
                    <span>
                      <Wind size={15} />
                      Wind speed
                    </span>
                    <strong>{Math.round(currentWeather.wind_speed_10m)} km/h</strong>
                  </div>
                  <div>
                    <span>
                      <Gauge size={15} />
                      Pressure
                    </span>
                    <strong>{Math.round(currentWeather.pressure_msl)} hPa</strong>
                  </div>
                  <div>
                    <span>
                      <Eye size={15} />
                      Visibility
                    </span>
                    <strong>{Math.round((currentWeather.visibility || 0) / 1000)} km</strong>
                  </div>
                  <div>
                    <span>
                      <Waves size={15} />
                      Wind direction
                    </span>
                    <strong>{Math.round(currentWeather.wind_direction_10m)}°</strong>
                  </div>
                </div>
              </article>

              <aside className="prototype-panel weather-alert-card">
                <div className="weather-panel-heading">
                  <h2>
                    <ShieldAlert size={18} />
                    Weather Alerts
                  </h2>
                  <span>{weatherAlerts.length} active</span>
                </div>

                <div className="weather-alert-list">
                  {weatherAlerts.map((alert) => (
                    <div key={alert.id} className={`weather-alert-item ${alert.level === "high" ? "high" : ""}`}>
                      <strong>{alert.title}</strong>
                      <p>{alert.body}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <article className="prototype-panel weather-forecast-card">
              <div className="weather-panel-heading">
                <h2>
                  <CalendarDays size={18} />
                  7-Day Forecast
                </h2>
                <span>Daily arrays from Open-Meteo</span>
              </div>

              <div className="weather-forecast-grid">
                {forecastDays.map((day, index) => (
                  <div key={day.date} className={`weather-forecast-day ${index === activeForecastIndex ? "active" : ""}`}>
                    <span>{formatDayLabel(day.date)}</span>
                    <small>{formatShortDate(day.date)}</small>
                    {getWeatherIcon(day.code, 22)}
                    <strong>{Math.round(day.maxTemp)}° / {Math.round(day.minTemp)}°</strong>
                    <p>{day.description}</p>
                    <div className="weather-forecast-meta">
                      <em>Rain chance: {Math.round(day.precipitationProbability)}%</em>
                      <em>Rain: {day.rainSum.toFixed(1)} mm</em>
                      <em>Humidity: {Math.round(day.humidityMax)}%</em>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <div className="prototype-weather-grid">
              <article className="prototype-panel weather-seasonal-card">
                <div className="weather-panel-heading">
                  <h2>
                    <Sprout size={18} />
                    Planting Window
                  </h2>
                  <span>{plantingGuidance.rainBand}</span>
                </div>

                <div className="weather-seasonal-summary">
                  <div>
                    <span>Rain in next 7 days</span>
                    <strong>{sevenDayRainTotal.toFixed(1)} mm</strong>
                  </div>
                  <div>
                    <span>Temperature signal</span>
                    <strong>{plantingGuidance.seasonSignal}</strong>
                  </div>
                  <div>
                    <span>Average max temp</span>
                    <strong>{plantingGuidance.avgMax.toFixed(1)}°C</strong>
                  </div>
                </div>

                <div className="weather-recommendation-box">
                  <strong>{plantingGuidance.title}</strong>
                  <p>{plantingGuidance.label}</p>
                  <p>{plantingGuidance.detail}</p>
                </div>
              </article>

              <article className="prototype-panel weather-trend-card">
                <div className="weather-panel-heading">
                  <h2>
                    <Thermometer size={18} />
                    Historical Climate Trend
                  </h2>
                  <div className="weather-range-switch">
                    {RANGE_OPTIONS.map((range) => (
                      <button
                        key={range}
                        type="button"
                        className={selectedRange === range ? "active" : ""}
                        onClick={() => setSelectedRange(range)}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="weather-trend-chart">
                  <svg
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Historical climate trend"
                  >
                    <path className="weather-trend-area" d={chartSeries.areaPath} />
                    <path className="weather-trend-line" d={chartSeries.tempPath} />
                    <path className="weather-trend-rain" d={chartSeries.rainPath} />
                  </svg>
                </div>

                <div className="weather-trend-axis">
                  {chartSeries.labels.length
                    ? chartSeries.labels.map((item) => (
                        <span key={`${item.index}-${item.label}`} style={{ left: `${item.left}%` }}>
                          {item.label}
                        </span>
                      ))
                    : ["No data"].map((label) => <span key={label}>{label}</span>)}
                </div>

                <div className="weather-trend-legend">
                  <span>
                    <i />
                    Avg temperature
                  </span>
                  <span>
                    <i className="dashed" />
                    Precipitation
                  </span>
                </div>
              </article>
            </div>

            <div className="weather-indicator-grid">
              <article className="prototype-panel weather-indicator-card centered">
                <span>Drought Probability</span>
                <div className="prototype-weather-ring">
                  <div className="prototype-weather-ring-inner">
                    <strong>{droughtRisk}%</strong>
                    <small>Risk</small>
                  </div>
                </div>
                <p>{droughtRisk >= 60 ? "Elevated drought concern" : "Moderate drought concern"}</p>
              </article>

              <article className="prototype-panel weather-indicator-card">
                <span>Rainfall Probability</span>
                <div className="prototype-weather-metric-number">
                  <strong>{Math.round(Math.max(...forecastDays.map((day) => day.precipitationProbability), 0))}%</strong>
                  <small className="orange">Peak risk</small>
                </div>
                <div className="weather-progress-track warning">
                  <div style={{ width: `${clampPercentage(Math.max(...forecastDays.map((day) => day.precipitationProbability), 0))}%` }} />
                </div>
                <p>Highest daily rainfall probability across the next 7 forecast days.</p>
              </article>

              <article className="prototype-panel weather-indicator-card">
                <span>Soil Moisture Signal</span>
                <div className="prototype-weather-metric-number">
                  <strong>{soilMoistureIndicator}%</strong>
                  <small className={soilMoistureIndicator < 35 ? "red" : "orange"}>
                    {soilMoistureIndicator < 35 ? "Low" : "Moderate"}
                  </small>
                </div>
                <div className="weather-progress-track blue">
                  <div style={{ width: `${soilMoistureIndicator}%` }} />
                </div>
                <p>Estimated from rainfall totals and current weather stress conditions.</p>
              </article>

              <article className="prototype-panel weather-indicator-card">
                <span>Evapotranspiration Signal</span>
                <div className="prototype-weather-evapo-row">
                  <div className="prototype-weather-evapo-icon">
                    <Waves size={18} />
                  </div>
                  <div>
                    <strong>{evapotranspirationIndicator}</strong>
                    <small>mm/day</small>
                  </div>
                </div>
                <p>Estimated live from current wind and temperature conditions for irrigation awareness.</p>
              </article>
            </div>

            <article className="prototype-panel weather-footer-card">
              <div className="weather-footer-meta">
                <div>
                  <span>Source</span>
                  <strong>Open-Meteo Live API</strong>
                </div>
                <div>
                  <span>Last updated</span>
                  <strong>{lastUpdated}</strong>
                </div>
              </div>
              <p>
                Current weather, 7-day forecast, alerts, and archive-based climate trends are being rendered from live Open-Meteo responses for the selected farm coordinates.
              </p>
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}

