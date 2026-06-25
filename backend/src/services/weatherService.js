const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_BASE_URL = "https://archive-api.open-meteo.com/v1/archive";
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 220;

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

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(","));
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function requestJson(url, options = {}) {
  const { timeoutMs = 8000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildOpenMeteoForecastUrl(latitude, longitude) {
  return buildUrl(FORECAST_BASE_URL, {
    latitude,
    longitude,
    timezone: "Africa/Kigali",
    forecast_days: 7,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "rain",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "pressure_msl",
      "visibility",
    ],
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "rain_sum",
      "precipitation_probability_max",
      "relative_humidity_2m_max",
      "wind_speed_10m_max",
      "et0_fao_evapotranspiration",
    ],
  });
}

function buildOpenMeteoArchiveUrl(latitude, longitude, startDate, endDate) {
  return buildUrl(ARCHIVE_BASE_URL, {
    latitude,
    longitude,
    timezone: "Africa/Kigali",
    start_date: startDate,
    end_date: endDate,
    daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
  });
}

function getWeatherDescription(code) {
  return WEATHER_CODE_MAP[code] || "Partly cloudy";
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

function summarizeTrend(values) {
  if (values.length < 2) {
    return "Stable";
  }
  const delta = values[values.length - 1] - values[0];
  if (delta > 2) return "Rising";
  if (delta < -2) return "Cooling";
  return "Stable";
}

function toForecastDays(daily = {}) {
  const time = Array.isArray(daily.time) ? daily.time : [];
  return time.map((date, index) => ({
    date,
    code: daily.weather_code?.[index],
    description: getWeatherDescription(daily.weather_code?.[index]),
    maxTemp: Number(daily.temperature_2m_max?.[index] ?? 0),
    minTemp: Number(daily.temperature_2m_min?.[index] ?? 0),
    precipitationProbability: Number(daily.precipitation_probability_max?.[index] ?? 0),
    rainSum: Number(daily.rain_sum?.[index] ?? 0),
    precipitationSum: Number(daily.precipitation_sum?.[index] ?? 0),
    humidityMax: Number(daily.relative_humidity_2m_max?.[index] ?? 0),
    windMax: Number(daily.wind_speed_10m_max?.[index] ?? 0),
    evapotranspiration: Number(daily.et0_fao_evapotranspiration?.[index] ?? 0),
  }));
}

function toHistoricalSeries(archive = {}) {
  const time = Array.isArray(archive.daily?.time) ? archive.daily.time : [];
  return time.map((date, index) => {
    const max = Number(archive.daily.temperature_2m_max?.[index] ?? 0);
    const min = Number(archive.daily.temperature_2m_min?.[index] ?? 0);
    return {
      date,
      avgTemp: Number(((max + min) / 2).toFixed(1)),
      maxTemp: max,
      minTemp: min,
      precipitationSum: Number(archive.daily.precipitation_sum?.[index] ?? 0),
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
    sampled.push(points[Math.round(slot * step)]);
  }
  return sampled;
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

async function ensureFarmAccess(user, farmId) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      farmerProfile: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!farm) {
    throw new ApiError(404, "Farm not found.");
  }

  const role = String(user.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "extensionofficer";
  const ownsFarm = farm.farmerProfile?.userId === user.id;

  if (!isAdmin && !ownsFarm) {
    throw new ApiError(403, "You are not allowed to access this farm weather data.");
  }

  return farm;
}

function mapWeatherHistoryRecord(snapshot) {
  if (!snapshot) return null;
  return {
    id: snapshot.id,
    farmId: snapshot.farmId,
    sourceMode: snapshot.sourceMode,
    sourceLabel: snapshot.sourceLabel,
    fetchedAt: snapshot.fetchedAt,
    currentTemperature: Number(snapshot.currentPayload?.temperature_2m ?? 0),
    currentHumidity: Number(snapshot.currentPayload?.relative_humidity_2m ?? 0),
    alertsCount: Array.isArray(snapshot.alerts) ? snapshot.alerts.length : 0,
    warning: snapshot.warning || "",
  };
}

async function getFarmWeatherDashboard(user, farmId, query = {}) {
  const farm = await ensureFarmAccess(user, farmId);
  const latitude = Number(farm.latitude);
  const longitude = Number(farm.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, "The selected farm does not have valid coordinates.");
  }

  const range = query.range || "1M";
  const { startDate, endDate } = getDateRange(range);
  const forecastUrl = buildOpenMeteoForecastUrl(latitude, longitude);
  const historicalUrl = buildOpenMeteoArchiveUrl(latitude, longitude, startDate, endDate);

  const forecast = await requestJson(forecastUrl, { timeoutMs: 7000 });
  const forecastDays = toForecastDays(forecast.daily);
  const alerts = buildAlerts(forecastDays);
  const plantingGuidance = buildPlantingGuidance(forecastDays);
  const sevenDayRainTotal = forecastDays.reduce((sum, day) => sum + day.rainSum, 0);
  const currentWeather = forecast.current || null;
  const droughtRisk = clampPercentage(Math.max(0, 100 - sevenDayRainTotal * 4));
  const soilMoistureIndicator = clampPercentage(Math.max(15, 100 - droughtRisk * 0.78));
  const evapotranspirationIndicator = currentWeather
    ? Number((Math.max(2.2, (currentWeather.wind_speed_10m || 0) / 6 + (currentWeather.temperature_2m || 0) / 8)).toFixed(1))
    : 0;

  let historicalSeries = [];
  let historicalWarning = "";
  try {
    const archive = await requestJson(historicalUrl, { timeoutMs: 7000 });
    historicalSeries = toHistoricalSeries(archive);
    await prisma.weatherArchiveCache.upsert({
      where: {
        farmId_rangeKey_startDate_endDate: {
          farmId,
          rangeKey: range,
          startDate,
          endDate,
        },
      },
      create: {
        farmId,
        rangeKey: range,
        sourceLabel: "Live Weather Data",
        startDate,
        endDate,
        series: historicalSeries,
        labels: buildHistoricalAxisLabels(historicalSeries, range),
      },
      update: {
        sourceLabel: "Live Weather Data",
        series: historicalSeries,
        labels: buildHistoricalAxisLabels(historicalSeries, range),
        fetchedAt: new Date(),
      },
    });
  } catch (error) {
    historicalWarning = "Historical climate trend could not be loaded right now. Live forecast data is still available.";
  }

  const sampledPoints =
    range === "1M"
      ? historicalSeries
      : downsampleHistoricalSeries(historicalSeries, range === "6M" ? 24 : 28);
  const tempValues = sampledPoints.map((item) => item.avgTemp);
  const rainValues = sampledPoints.map((item) => item.precipitationSum);
  const chartSeries = {
    points: sampledPoints,
    tempValues,
    rainValues,
    areaPath: buildAreaPath(tempValues, CHART_WIDTH, CHART_HEIGHT),
    tempPath: buildTrendPath(tempValues, CHART_WIDTH, CHART_HEIGHT),
    rainPath: buildTrendPath(rainValues, CHART_WIDTH, CHART_HEIGHT),
    labels: buildHistoricalAxisLabels(sampledPoints, range),
  };

  const snapshot = await prisma.weatherSnapshot.create({
    data: {
      farmId,
      sourceMode: "backend",
      sourceLabel: "Live Weather Data",
      latitude,
      longitude,
      currentPayload: currentWeather,
      dailyPayload: forecast.daily,
      forecastDays,
      alerts,
      plantingGuidance,
      metrics: {
        sevenDayRainTotal,
        droughtRisk,
        soilMoistureIndicator,
        evapotranspirationIndicator,
        chartRange: range,
      },
      warning: historicalWarning || null,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "WEATHER_DASHBOARD_FETCHED",
    entityType: "WeatherSnapshot",
    entityId: snapshot.id,
    details: {
      farmId,
      farmName: farm.farmName,
      latitude,
      longitude,
      range,
    },
  });

  return {
    sourceMode: "backend",
    sourceLabel: "Live Weather Data",
    farm: {
      id: farm.id,
      name: farm.farmName,
      district: farm.district,
      sector: farm.sector,
      province: farm.province,
      coordinates: {
        latitude,
        longitude,
      },
    },
    current: currentWeather,
    daily: forecast.daily,
    forecastDays,
    alerts,
    plantingGuidance,
    historicalSeries,
    chartSeries,
    metrics: {
      sevenDayRainTotal,
      droughtRisk,
      soilMoistureIndicator,
      evapotranspirationIndicator,
      activeForecastIndex: forecastDays.findIndex((day) => new Date(day.date).toDateString() === new Date().toDateString()),
    },
    forecastUrl,
    historicalUrl,
    selectedRange: range,
    warning: historicalWarning,
    lastUpdated: formatTimestamp(forecast.generationtime_ms ? new Date() : forecast.current?.time || new Date()),
    snapshotId: snapshot.id,
  };
}

async function listFarmWeatherHistory(user, farmId, query = {}) {
  await ensureFarmAccess(user, farmId);
  const limit = Number(query.limit || 8);
  const snapshots = await prisma.weatherSnapshot.findMany({
    where: { farmId },
    orderBy: { fetchedAt: "desc" },
    take: limit,
  });

  const archives = await prisma.weatherArchiveCache.findMany({
    where: { farmId },
    orderBy: { fetchedAt: "desc" },
    take: 6,
  });

  return {
    snapshots: snapshots.map(mapWeatherHistoryRecord),
    archives: archives.map((entry) => ({
      id: entry.id,
      rangeKey: entry.rangeKey,
      startDate: entry.startDate,
      endDate: entry.endDate,
      fetchedAt: entry.fetchedAt,
      sourceLabel: entry.sourceLabel,
      pointsCount: Array.isArray(entry.series) ? entry.series.length : 0,
    })),
  };
}

module.exports = {
  buildOpenMeteoForecastUrl,
  buildOpenMeteoArchiveUrl,
  getFarmWeatherDashboard,
  listFarmWeatherHistory,
};
