import {
  AlertTriangle,
  CalendarDays,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  ShieldAlert,
  Sprout,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiClient,
  buildOpenMeteoArchiveUrl,
  buildOpenMeteoForecastUrl,
} from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { useFarmerData } from "../../context/FarmerDataContext";
import { CROP_REQUIREMENTS, findCropRequirements } from "../../data/cropRequirements";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { StatusBadge } from "../../components/common/StatusBadge";

function buildFallbackForecast() {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    days.push({
      date: date.toISOString().slice(0, 10),
      code: i === 0 ? 1 : i < 3 ? 2 : 3,
      description: i === 0 ? "Mainly clear" : i < 3 ? "Partly cloudy" : "Overcast",
      maxTemp: 24 + Math.round(Math.random() * 4),
      minTemp: 16 + Math.round(Math.random() * 3),
      precipitationProbability: Math.round(Math.random() * 40),
      rainSum: Math.round(Math.random() * 5 * 10) / 10,
      precipitationSum: Math.round(Math.random() * 8 * 10) / 10,
      humidityMax: 60 + Math.round(Math.random() * 20),
      windMax: 10 + Math.round(Math.random() * 12),
    });
  }
  return {
    current: { temperature_2m: 24, relative_humidity_2m: 65, wind_speed_10m: 12 },
    daily: {
      time: days.map(d => d.date),
      weather_code: days.map(d => d.code),
      temperature_2m_max: days.map(d => d.maxTemp),
      temperature_2m_min: days.map(d => d.minTemp),
      precipitation_probability_max: days.map(d => d.precipitationProbability),
      rain_sum: days.map(d => d.rainSum),
      precipitation_sum: days.map(d => d.precipitationSum),
      relative_humidity_2m_max: days.map(d => d.humidityMax),
      wind_speed_10m_max: days.map(d => d.windMax),
    },
  };
}

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
  if (!Array.isArray(values) || !values.length) return "";
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
  if (!Array.isArray(values) || values.length < 2) return "Stable";
  const delta = values[values.length - 1] - values[0];
  if (delta > 2) return "Rising";
  if (delta < -2) return "Cooling";
  return "Stable";
}

function buildAlerts(days, cropReq) {
  if (!Array.isArray(days) || !days.length) return [{ id: "no-alert", level: "low", title: "No Alert", body: "No active weather alerts." }];
  const alerts = [];

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

  if (cropReq) {
    const totalRain = days.reduce((sum, day) => sum + day.rainSum, 0);
    if (totalRain < cropReq.minRain) {
      const deficit = cropReq.minRain - totalRain;
      alerts.push({
        id: "drought-risk",
        level: deficit > 10 ? "high" : "medium",
        title: "Drought Risk",
        body: `Drought Risk: The next 7 days total only ${totalRain.toFixed(1)} mm of rain, below the ${cropReq.minRain} mm planting requirement for ${cropReq.name}.`,
      });
    }
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
      body: "No active weather alerts for this period.",
    });
  }

  return alerts;
}

function generatePlantingRecommendation(days, cropReq) {
  if (!Array.isArray(days) || !days.length) return { recommendedAction: "No forecast data available", cropName: "", sevenDayRainTotal: 0, requiredRainfall: 0, temperatureSuitable: null, confidence: 0, explanation: "No forecast data available.", suggestedActions: [], seasonSignal: "Stable" };
  const totalRain = days.reduce((sum, day) => sum + day.rainSum, 0);
  const avgMaxTemp = days.length ? days.reduce((sum, d) => sum + d.maxTemp, 0) / days.length : 0;
  const avgMinTemp = days.length ? days.reduce((sum, d) => sum + d.minTemp, 0) / days.length : 0;

  if (!cropReq) {
    return {
      recommendedAction: "Select a crop to see planting recommendations",
      cropName: "",
      sevenDayRainTotal: totalRain,
      requiredRainfall: 0,
      temperatureSuitable: null,
      confidence: 0,
      explanation: "Choose a crop from the selector above to get AI-driven planting guidance based on the 7-day weather forecast.",
      suggestedActions: [],
      seasonSignal: summarizeTrend(days.map((day) => day.maxTemp)),
    };
  }

  const tempInRange = avgMaxTemp >= cropReq.idealTempMin && avgMaxTemp <= cropReq.idealTempMax;
  const rainRatio = totalRain / cropReq.minRain;

  let recommendedAction;
  let explanation;
  let suggestedActions;

  if (totalRain < cropReq.minRain * 0.5) {
    recommendedAction = "Delay planting 10–14 days";
    explanation = `Only ${totalRain.toFixed(1)} mm of rain is forecast over the next 7 days, well below the ${cropReq.minRain} mm minimum required for ${cropReq.name}. Soil moisture recharge is likely insufficient for safe germination.`;
    suggestedActions = [
      "Delay planting by 10–14 days until more rainfall is expected",
      "Consider seed priming to improve germination under marginal moisture",
      "Prepare irrigation support if available",
    ];
  } else if (totalRain < cropReq.minRain) {
    recommendedAction = "Delay planting 3–7 days or prepare irrigation support";
    explanation = `The next 7 days total ${totalRain.toFixed(1)} mm of rain, slightly below the ${cropReq.minRain} mm requirement for ${cropReq.name}. With supplemental irrigation, planting may proceed.`;
    suggestedActions = [
      "Delay planting by 3–7 days if relying solely on rainfall",
      "Supplement with irrigation if planting immediately",
      "Use moisture-retention practices such as mulching",
    ];
  } else if (totalRain <= cropReq.minRain * 1.5) {
    recommendedAction = "Planting window is suitable";
    explanation = `The next 7 days provide ${totalRain.toFixed(1)} mm of expected rainfall, which meets the planting requirement for ${cropReq.name}.`;
    suggestedActions = [
      "Proceed with planting preparations",
      "Monitor soil moisture levels before sowing",
      "Apply starter fertilizer at planting time",
    ];
  } else {
    recommendedAction = "Avoid planting immediately due to waterlogging risk";
    explanation = `The next 7 days total ${totalRain.toFixed(1)} mm of rain, which exceeds the ${cropReq.minRain} mm requirement for ${cropReq.name} and may cause waterlogging.`;
    suggestedActions = [
      "Delay planting until heavy rainfall subsides",
      "Ensure drainage channels are clear",
      "Consider raised beds for better drainage",
    ];
  }

  let confidence = 85;
  if (days.length === 7) confidence += 5;
  else if (days.length < 5) confidence -= 10;

  if (tempInRange) confidence += 5;
  else if (avgMaxTemp > cropReq.idealTempMax + 5 || avgMinTemp < cropReq.idealTempMin - 5) confidence -= 15;
  else confidence -= 5;

  const deficit = Math.abs(totalRain - cropReq.minRain);
  if (deficit > 15) confidence += 5;
  else if (deficit < 3) confidence -= 10;

  confidence = Math.max(40, Math.min(100, Math.round(confidence)));

  return {
    recommendedAction,
    cropName: cropReq.name,
    sevenDayRainTotal: totalRain,
    requiredRainfall: cropReq.minRain,
    temperatureSuitable: tempInRange,
    confidence,
    explanation,
    suggestedActions,
    seasonSignal: summarizeTrend(days.map((day) => day.maxTemp)),
  };
}

function toForecastDays(daily) {
  return (Array.isArray(daily?.time) ? daily.time : []).map((date, index) => ({
    date,
    code: daily?.weather_code?.[index],
    description: getWeatherDescription(daily?.weather_code?.[index]),
    maxTemp: daily?.temperature_2m_max?.[index],
    minTemp: daily?.temperature_2m_min?.[index],
    precipitationProbability: daily?.precipitation_probability_max?.[index] ?? 0,
    rainSum: daily?.rain_sum?.[index] ?? 0,
    precipitationSum: daily?.precipitation_sum?.[index] ?? 0,
    humidityMax: daily?.relative_humidity_2m_max?.[index] ?? 0,
    windMax: daily?.wind_speed_10m_max?.[index] ?? 0,
  }));
}

function toHistoricalSeries(archive) {
  return (Array.isArray(archive?.daily?.time) ? archive.daily.time : []).map((date, index) => {
    const max = archive?.daily?.temperature_2m_max?.[index] ?? 0;
    const min = archive?.daily?.temperature_2m_min?.[index] ?? 0;
    return {
      date,
      avgTemp: Number(((max + min) / 2).toFixed(1)),
      maxTemp: max,
      minTemp: min,
      precipitationSum: archive?.daily?.precipitation_sum?.[index] ?? 0,
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
  const farms = (Array.isArray(currentFarms) ? currentFarms : []).length ? currentFarms : data.farms;
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [selectedRange, setSelectedRange] = useState("1M");
  const [selectedCropName, setSelectedCropName] = useState("");
  const [forecastData, setForecastData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0] || null,
    [farms, selectedFarmId]
  );
  const backendMode = isBackendSessionActive() && Boolean(selectedFarm?.id);

  useEffect(() => {
    if (!selectedFarmId && farms[0]?.id) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  useEffect(() => {
    if (selectedFarm?.primaryCrop && findCropRequirements(selectedFarm.primaryCrop)) {
      setSelectedCropName(selectedFarm.primaryCrop);
    } else if (!selectedCropName && CROP_REQUIREMENTS.length) {
      setSelectedCropName(CROP_REQUIREMENTS[0].name);
    }
  }, [selectedFarm]);

  useEffect(() => {
    if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
      const fallback = buildFallbackForecast();
      setForecastData(fallback);
      setHistoricalData([]);
      setWarning("Live data unavailable. Showing local demo data.");
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
        if (import.meta.env.DEV) {
          console.log("[WeatherPage] Open-Meteo API failed, using fallback demo data");
        }
        const fallback = buildFallbackForecast();
        setForecastData(fallback);
        setHistoricalData([]);
        setWarning("Live data unavailable. Showing local demo data.");
        setLastUpdated(formatTimestamp(new Date()));
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

    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        const fallback = buildFallbackForecast();
        setForecastData(fallback);
        setHistoricalData([]);
        setWarning("Live data unavailable. Showing local demo data.");
        setLastUpdated(formatTimestamp(new Date()));
      }
    }, 5000);

    loadWeather()
      .catch(() => {
        if (!cancelled) {
          const fallback = buildFallbackForecast();
          setForecastData(fallback);
          setHistoricalData([]);
          setWarning("Live data unavailable. Showing local demo data.");
        }
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
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

  const cropReq = useMemo(() => findCropRequirements(selectedCropName), [selectedCropName]);
  const weatherAlerts = useMemo(() => buildAlerts(forecastDays, cropReq), [forecastDays, cropReq]);
  const plantingRecommendation = useMemo(
    () => generatePlantingRecommendation(forecastDays, cropReq),
    [forecastDays, cropReq]
  );
  const activeForecastIndex = useMemo(() => {
    const todayIndex = forecastDays.findIndex((day) => isSameCalendarDay(day.date));
    return todayIndex >= 0 ? todayIndex : 0;
  }, [forecastDays]);

  const todayForecast = forecastDays[activeForecastIndex] || null;

  const sevenDayRainTotal = useMemo(
    () => forecastDays.reduce((sum, day) => sum + day.rainSum, 0),
    [forecastDays]
  );

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
        <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "var(--card)", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <Sprout size={16} style={{ color: "var(--text-muted)" }} />
          <select value={selectedCropName} onChange={(event) => setSelectedCropName(event.target.value)} style={{ border: "none", background: "transparent", fontFamily: "var(--font)", fontSize: "14px", outline: "none", cursor: "pointer", color: "var(--text-main)" }}>
            {CROP_REQUIREMENTS.map((crop) => (
              <option key={crop.name} value={crop.name}>{crop.name}</option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{selectedFarm?.location?.label || selectedFarm?.region || ""}</span>
      </div>

      {loading ? <div style={{ padding: "12px 16px", background: "var(--light-green)", borderRadius: "10px", color: "var(--primary-green)", fontWeight: 600 }}>Loading live weather data...</div> : null}
      {!loading && error ? <div style={{ padding: "12px 16px", background: "#FFEBEE", borderRadius: "10px", color: "var(--danger)", fontWeight: 500 }}>{error}</div> : null}
      {!loading && !error && warning ? <div style={{ padding: "12px 16px", background: "#FFF8E1", borderRadius: "10px", color: "#E65100", fontWeight: 500 }}>{warning}</div> : null}

      {!loading && todayForecast ? (
        <>
          <div className="weather-page-hero">
            <div className="weather-hero-main">
              <div className="weather-hero-top">
                <div>
                  <div className="weather-hero-location"><MapPin size={16} />{selectedFarm?.name || "Farm"}</div>
                  <div className="weather-hero-condition" style={{ marginTop: "16px" }}>
                    <div className="weather-hero-icon-wrap">{getWeatherIcon(todayForecast.code, 36)}</div>
                    <div>
                      <div className="weather-hero-temp">{Math.round(todayForecast.maxTemp)}°C</div>
                      <div className="weather-hero-desc">{todayForecast.description}</div>
                    </div>
                  </div>
                </div>
                <StatusBadge status="verified">Today's Forecast</StatusBadge>
              </div>
              <div className="weather-hero-metrics">
                <div className="weather-hero-metric"><small>Max Temp</small><strong>{Math.round(todayForecast.maxTemp)}°C</strong></div>
                <div className="weather-hero-metric"><small>Rainfall</small><strong>{todayForecast.rainSum.toFixed(1)} mm</strong></div>
                <div className="weather-hero-metric"><small>Humidity</small><strong>{Math.round(todayForecast.humidityMax)}%</strong></div>
                <div className="weather-hero-metric"><small>Wind</small><strong>{Math.round(todayForecast.windMax)} km/h</strong></div>
                <div className="weather-hero-metric"><small>Rain Chance</small><strong>{Math.round(todayForecast.precipitationProbability)}%</strong></div>
                <div className="weather-hero-metric"><small>Min Temp</small><strong>{Math.round(todayForecast.minTemp)}°C</strong></div>
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
                {cropReq ? (
                  <>
                    <div className="weather-rec-stats" style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "8px 0" }}>
                      <span className="weather-rec-stat" style={{ background: "var(--light-green)", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "var(--primary-green)" }}>
                        {plantingRecommendation.sevenDayRainTotal.toFixed(1)} mm rain
                      </span>
                      <span className="weather-rec-stat" style={{ background: "var(--light-green)", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "var(--primary-green)" }}>
                        {plantingRecommendation.requiredRainfall} mm needed
                      </span>
                      <span className="weather-rec-stat" style={{ background: plantingRecommendation.temperatureSuitable ? "var(--light-green)" : "#FFF3E0", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: plantingRecommendation.temperatureSuitable ? "var(--primary-green)" : "#E65100" }}>
                        {plantingRecommendation.temperatureSuitable ? "Temp suitable" : "Temp marginal"}
                      </span>
                      <span className="weather-rec-stat" style={{ background: "#E3F2FD", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#1565C0" }}>
                        AI {plantingRecommendation.confidence}%
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", lineHeight: 1.5, margin: "6px 0" }}>{plantingRecommendation.explanation}</p>
                    <div className={`weather-planting-badge ${plantingRecommendation.recommendedAction.includes("Delay") || plantingRecommendation.recommendedAction.includes("Avoid") ? "delay" : plantingRecommendation.recommendedAction.includes("suitable") ? "good" : "caution"}`}>
                      {plantingRecommendation.recommendedAction}
                    </div>
                    {plantingRecommendation.suggestedActions.length > 0 && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                        {plantingRecommendation.suggestedActions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "13px", lineHeight: 1.5, margin: "6px 0" }}>{plantingRecommendation.explanation}</p>
                    <div className="weather-planting-badge delay">Select a crop</div>
                  </>
                )}
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
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{plantingRecommendation.seasonSignal}</span>
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
              <p>{forecastDays.find(d => d.rainSum >= 3 && d.rainSum <= 15 && d.maxTemp >= 18 && d.maxTemp <= 30) ? formatShortDate(forecastDays.find(d => d.rainSum >= 3 && d.rainSum <= 15 && d.maxTemp >= 18 && d.maxTemp <= 30)?.date) : "Monitor conditions"}</p>
            </div>
            <div className="weather-insight-card">
              <div className="insight-icon"><AlertTriangle size={24} /></div>
              <strong>Harvest Warning</strong>
              <p>{weatherAlerts.some(a => a.level === "high") ? "Adverse weather expected - prepare protection" : "No harvest risk in forecast window"}</p>
            </div>
            <div className="weather-insight-card">
              <div className="insight-icon"><Droplets size={24} /></div>
              <strong>Irrigation Need</strong>
              <p>{cropReq && sevenDayRainTotal < cropReq.minRain ? `${Math.round((cropReq.minRain - sevenDayRainTotal) * 10)} L/m² supplemental water recommended for ${cropReq.name}` : "Sufficient rainfall expected"}</p>
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

