import {
  AlertTriangle,
  CalendarDays,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  MoveRight,
  ShieldAlert,
  Sprout,
  SunMedium,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";

const forecastIcons = [SunMedium, CloudSun, CloudRain, CloudSun, SunMedium, CloudRain, Thermometer];
const monthLabels = {
  "1M": ["W1", "W2", "W3", "W4"],
  "6M": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "1Y": ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDegrees(value) {
  return `${Math.round(value)}\u00B0C`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createDefaultFarm() {
  return {
    id: "default-weather-location",
    name: "Regional Weather Hub",
    region: "Northern Highlands",
    primaryCrop: "Hybrid Maize",
    landType: "Loamy",
    sizeHectares: 18,
    irrigationType: "Drip Irrigation",
    location: {
      lat: -1.9441,
      lng: 29.8736,
      mapX: 51,
      mapY: 48,
      label: "Regional weather operations center",
    },
  };
}

function buildSeriesPoints(values) {
  return values
    .map((point, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - point;
      return `${index === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
}

function buildAreaPath(values) {
  const line = values.map((point, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - point;
    return `${index === 0 ? "M" : "L"} ${x},${y}`;
  });

  return `${line.join(" ")} L 100,100 L 0,100 Z`;
}

function buildWeatherAlerts({
  forecast,
  humidity,
  droughtRisk,
  soilMoisture,
  evapotranspiration,
  currentTemp,
  last30DaysRain,
}) {
  const severeHeatDays = forecast.filter((item) => item.high >= 32).length;
  const extremeHeatDay = forecast.some((item) => item.high >= 35);
  const intenseRainDays = forecast.filter((item) => item.rainChance >= 70).length;
  const heavyRainDays = forecast.filter((item) => item.rainChance >= 60 && (item.rainfall ?? 0) >= 12).length;
  const frostRisk = forecast.some((item) => item.low <= 6);
  const dryAirStress = humidity <= 45 && evapotranspiration >= 4.5;
  const soilDryness = soilMoisture <= 22;
  const lowRecentRain = last30DaysRain <= 45;

  return [
    extremeHeatDay || severeHeatDays >= 3
      ? {
          id: "heatwave",
          type: "heatwave",
          title: "Heatwave advisory",
          message:
            severeHeatDays >= 3
              ? "Three or more forecast days exceed 32 C. Shift irrigation to cooler hours and monitor crop stress closely."
              : "An extreme heat spike is forecast above 35 C. Protect sensitive crops and review irrigation immediately.",
          severity: "high",
        }
      : null,
    heavyRainDays >= 2 || intenseRainDays >= 3
      ? {
          id: "rainfall",
          type: "heavy-rain",
          title: "Heavy rain watch",
          message:
            "Multiple forecast periods show strong rainfall and runoff potential. Delay fertilizer top-dressing and inspect drainage pathways.",
          severity: "medium",
        }
      : null,
    frostRisk
      ? {
          id: "frost",
          type: "frost",
          title: "Cold stress warning",
          message: "Forecast minimum temperatures may approach cold-stress levels. Protect seedlings and delay sensitive field operations.",
          severity: "medium",
        }
      : null,
    dryAirStress
      ? {
          id: "humidity",
          type: "dry-air",
          title: "Low humidity notice",
          message:
            "Low humidity combined with high evapotranspiration may accelerate moisture loss. Prioritize morning irrigation and reduce plant stress.",
          severity: "medium",
        }
      : null,
    droughtRisk >= 60 || (soilDryness && lowRecentRain) || (currentTemp >= 30 && evapotranspiration >= 5)
      ? {
          id: "drought",
          type: "drought",
          title: "Drought risk trigger",
          message:
            "Low surface moisture and weak recent rainfall signal a rising drought pattern for this farm. Favor moisture conservation and drought-tolerant scheduling.",
          severity: "high",
        }
      : null,
  ].filter(Boolean);
}

function hashFarm(farm) {
  const latSeed = Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100);
  const lngSeed = Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100);
  const mapSeed = Number(farm?.location?.mapX || 0) + Number(farm?.location?.mapY || 0);
  const sizeSeed = Math.round(Number(farm?.sizeHectares || 0));
  return latSeed + lngSeed + mapSeed + sizeSeed;
}

function createFallbackWeatherDataset(farm) {
  const sourceFarm = farm || createDefaultFarm();
  const seed = hashFarm(sourceFarm);
  const rainfallProbability = clamp(32 + (seed % 41), 20, 92);
  const droughtRisk = clamp(18 + (seed % 57), 8, 89);
  const currentTemp = 21 + (seed % 11);
  const humidity = clamp(48 + (seed % 36), 35, 94);
  const rainfall = clamp(4 + (seed % 19), 2, 28);
  const pressure = 1005 + (seed % 11);
  const wind = 8 + (seed % 15);
  const visibility = clamp(6 + (seed % 8), 4, 15);
  const soilMoisture = clamp(18 + (seed % 47), 12, 76);
  const evapotranspiration = Number((3.4 + (seed % 28) / 10).toFixed(1));
  const droughtLevel = droughtRisk > 65 ? "High" : droughtRisk > 40 ? "Moderate" : "Low";
  const updateTimestamp = new Date(Date.now() - ((seed % 90) + 10) * 60000).toISOString();
  const microclimateOffset = ((seed % 9) - 4) / 10;

  const forecast = Array.from({ length: 7 }, (_, index) => {
    const high = currentTemp + ((index + seed) % 6) - 1 + microclimateOffset;
    const low = high - (6 + ((seed + index) % 3));
    const rainChance = clamp(rainfallProbability + index * 4 - (seed % 9), 12, 96);
    const humidityValue = clamp(humidity + index * 2 - (seed % 7), 35, 95);

    return {
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
      label: index === 0 ? "Today" : `${index + 1}D`,
      high,
      low,
      rainChance,
      humidity: humidityValue,
      icon: forecastIcons[index],
      condition:
        rainChance > 72 ? "Heavy rain risk" : rainChance > 48 ? "Passing showers" : high > 30 ? "Dry heat" : "Stable",
    };
  });

  const trendProfiles = {
    "1M": {
      temperature: [32, 45, 41, 56],
      rainfall: [28, 34, 29, 48],
    },
    "6M": {
      temperature: [24, 38, 31, 57, 44, 63],
      rainfall: [19, 23, 26, 34, 28, 39],
    },
    "1Y": {
      temperature: [31, 27, 36, 42, 48, 39, 34, 29, 37, 43, 51, 45],
      rainfall: [18, 20, 25, 31, 37, 43, 38, 29, 24, 22, 19, 16],
    },
  };

  const trendData = Object.fromEntries(
    Object.entries(trendProfiles).map(([range, profile]) => {
      const temperature = profile.temperature.map((value, index) =>
        clamp(value + ((seed + index) % 7) - 3, 12, 88)
      );
      const rainfallSeries = profile.rainfall.map((value, index) =>
        clamp(value + ((seed + index * 2) % 8) - 3, 8, 76)
      );

      return [range, { temperature, rainfall: rainfallSeries, labels: monthLabels[range] }];
    })
  );

  const alerts = buildWeatherAlerts({
    forecast: forecast.map((item) => ({ ...item, rainfall: rainfall / 7 })),
    humidity,
    droughtRisk,
    soilMoisture,
    evapotranspiration,
    currentTemp,
    last30DaysRain: rainfall * 18,
  });

  return {
    farm: sourceFarm,
    current: {
      temperature: currentTemp,
      rainfall,
      humidity,
      condition: rainfallProbability > 62 ? "Partly cloudy with rainfall build-up" : "Dry, stable conditions",
      pressure,
      wind,
      windDirection: 0,
      visibility,
    },
    forecast,
    trendData,
    rainfallProbability,
    droughtRisk,
    droughtLevel,
    soilMoisture,
    evapotranspiration,
    alerts,
    plantingWindows: [
      {
        label: "Best planting window",
        value: rainfallProbability > 55 ? "Next 5-7 days" : "Wait 10-14 days",
        detail:
          rainfallProbability > 55
            ? "Moisture outlook supports maize and bean establishment."
            : "Soil recharge is still limited. Delay sensitive seed placement.",
      },
      {
        label: "Microclimate",
        value: sourceFarm.location?.label || `${sourceFarm.region} field zone`,
        detail: `Localized weather is being estimated from the saved farm coordinates.`,
      },
      {
        label: "Primary crop guidance",
        value: sourceFarm.primaryCrop || "General mixed crop",
        detail:
          droughtRisk > 55
            ? "Favor conservation tillage and staggered planting blocks."
            : "Field conditions are suitable for steady vegetative growth.",
      },
    ],
    seasonalForecast: {
      quarter: "Q3 Outlook",
      narrative:
        rainfallProbability > 58
          ? "Rainfall accumulation is tracking above the long-term average, creating stronger planting opportunities for medium-cycle crops."
          : "Rainfall is expected to stay uneven across field pockets, so planting plans should be staggered to reduce moisture stress exposure.",
      expectedRainfall: `${Math.round(rainfall * 18)}-${Math.round(rainfall * 22)} mm`,
      temperatureAnomaly: `${microclimateOffset >= 0 ? "+" : ""}${microclimateOffset.toFixed(1)} C`,
      window:
        rainfallProbability > 55
          ? "Planting window is open for moisture-responsive crops."
          : "Use short-cycle or drought-tolerant crops until rainfall improves.",
    },
    updateTimestamp,
    dataSources: [
      { label: "Fallback local model", detail: "Using stored farm coordinates for simulated insights" },
    ],
  };
}

function weatherCodeSummary(code) {
  if ([95, 96, 99].includes(code)) return "Thunderstorm risk";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "Rain showers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Cold front";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if (code === 0) return "Clear sky";
  if ([45, 48].includes(code)) return "Fog risk";
  return "Stable conditions";
}

function pickForecastIcon(index, code, rainChance) {
  if (rainChance >= 55 || [61, 63, 65, 80, 81, 82].includes(code)) return CloudRain;
  if ([1, 2, 3].includes(code)) return CloudSun;
  if (index === 6) return Thermometer;
  return forecastIcons[index] || SunMedium;
}

function formatWindDirection(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round((((degrees || 0) % 360) / 45)) % 8;
  return directions[index];
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function chunkWeekly(values) {
  const chunks = [];
  for (let index = 0; index < values.length; index += 7) {
    chunks.push(values.slice(index, index + 7));
  }
  return chunks.slice(-4);
}

function normalizeSeries(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values.map(() => 50);
  }

  return values.map((value) => 18 + ((value - min) / (max - min)) * 64);
}

function aggregateMonthly(times, temperatureSeries, rainSeries, monthCount) {
  const buckets = new Map();

  times.forEach((time, index) => {
    const date = new Date(time);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key) || {
      label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      temp: [],
      rain: [],
    };
    bucket.temp.push(Number(temperatureSeries[index] || 0));
    bucket.rain.push(Number(rainSeries[index] || 0));
    buckets.set(key, bucket);
  });

  return Array.from(buckets.values())
    .slice(-monthCount)
    .map((bucket) => ({
      label: bucket.label,
      temperature: bucket.temp.reduce((sum, value) => sum + value, 0) / Math.max(bucket.temp.length, 1),
      rainfall: bucket.rain.reduce((sum, value) => sum + value, 0),
    }));
}

function buildTrendDataFromArchive(archive) {
  const times = archive?.daily?.time || [];
  const tempSeries = archive?.daily?.temperature_2m_mean || [];
  const rainSeries = archive?.daily?.precipitation_sum || [];

  const recentWeeks = chunkWeekly(
    tempSeries.map((temperature, index) => ({
      temperature: Number(temperature || 0),
      rainfall: Number(rainSeries[index] || 0),
    }))
  ).map((week, index) => ({
    label: monthLabels["1M"][index],
    temperature:
      week.reduce((sum, point) => sum + point.temperature, 0) / Math.max(week.length, 1),
    rainfall:
      week.reduce((sum, point) => sum + point.rainfall, 0) / Math.max(week.length, 1),
  }));

  const recentMonths = aggregateMonthly(times, tempSeries, rainSeries, 6);
  const recentYear = aggregateMonthly(times, tempSeries, rainSeries, 12);

  const oneMonthTemp = normalizeSeries(recentWeeks.map((item) => item.temperature));
  const oneMonthRain = normalizeSeries(recentWeeks.map((item) => item.rainfall));
  const sixMonthTemp = normalizeSeries(recentMonths.map((item) => item.temperature));
  const sixMonthRain = normalizeSeries(recentMonths.map((item) => item.rainfall));
  const yearTemp = normalizeSeries(recentYear.map((item) => item.temperature));
  const yearRain = normalizeSeries(recentYear.map((item) => item.rainfall));

  return {
    "1M": {
      labels: recentWeeks.map((item) => item.label),
      temperature: oneMonthTemp,
      rainfall: oneMonthRain,
    },
    "6M": {
      labels: recentMonths.map((item) => item.label),
      temperature: sixMonthTemp,
      rainfall: sixMonthRain,
    },
    "1Y": {
      labels: recentYear.map((item) => item.label),
      temperature: yearTemp,
      rainfall: yearRain,
    },
  };
}

function transformOpenMeteoToDataset(farm, forecastResponse, archiveResponse) {
  const current = forecastResponse.current || {};
  const daily = forecastResponse.daily || {};
  const currentRainfall = Number(current.rain || current.precipitation || 0);
  const humidity = Number(current.relative_humidity_2m || 0);
  const visibilityKm = Number(current.visibility || 0) / 1000;
  const soilMoisture = Number(current.soil_moisture_0_to_1cm || 0) * 100;
  const evapotranspiration = Number(current.et0_fao_evapotranspiration || 0);
  const rainProbabilities = daily.precipitation_probability_max || [];
  const rainfallProbability = Math.round(
    rainProbabilities.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(rainProbabilities.length, 1)
  );

  const last30DaysRain =
    (archiveResponse?.daily?.precipitation_sum || [])
      .slice(-30)
      .reduce((sum, value) => sum + Number(value || 0), 0);
  const droughtRisk = clamp(
    Math.round(100 - Math.min(last30DaysRain, 120) * 0.7 + (soilMoisture < 25 ? 15 : 0)),
    8,
    95
  );
  const droughtLevel = droughtRisk > 65 ? "High" : droughtRisk > 40 ? "Moderate" : "Low";

  const forecast = (daily.time || []).slice(0, 7).map((time, index) => {
    const high = Number(daily.temperature_2m_max?.[index] || 0);
    const low = Number(daily.temperature_2m_min?.[index] || 0);
    const rainChance = Number(daily.precipitation_probability_max?.[index] || 0);
    const rainfallAmount = Number(daily.precipitation_sum?.[index] || 0);
    const code = Number(daily.weather_code?.[index] || 0);
    const Icon = pickForecastIcon(index, code, rainChance);
    const date = new Date(time);

    return {
      day: date.toLocaleString("en-US", { weekday: "short" }),
      label: index === 0 ? "Today" : `${index + 1}D`,
      high,
      low,
      rainChance,
      rainfall: rainfallAmount,
      humidity: clamp(humidity + index * 2 - 3, 32, 96),
      icon: Icon,
      condition: weatherCodeSummary(code),
    };
  });

  const alerts = buildWeatherAlerts({
    forecast,
    humidity,
    droughtRisk,
    soilMoisture,
    evapotranspiration,
    currentTemp: Number(current.temperature_2m || 0),
    last30DaysRain,
  });

  const plantingWindow =
    rainfallProbability > 55 ? "Next 5-7 days" : rainfallProbability > 35 ? "Monitor the next 7-10 days" : "Delay 10-14 days";

  const trendData = buildTrendDataFromArchive(archiveResponse);
  const temperatureAnomalyBase = archiveResponse?.daily?.temperature_2m_mean || [];
  const last7Temp =
    temperatureAnomalyBase.slice(-7).reduce((sum, value) => sum + Number(value || 0), 0) /
    Math.max(Math.min(temperatureAnomalyBase.length, 7), 1);
  const previous7Temp =
    temperatureAnomalyBase.slice(-14, -7).reduce((sum, value) => sum + Number(value || 0), 0) /
    Math.max(Math.min(Math.max(temperatureAnomalyBase.length - 7, 0), 7), 1);
  const anomaly = Number.isFinite(last7Temp - previous7Temp) ? last7Temp - previous7Temp : 0;

  return {
    farm,
    current: {
      temperature: Number(current.temperature_2m || 0),
      rainfall: currentRainfall,
      humidity,
      condition: weatherCodeSummary(Number(current.weather_code || 0)),
      pressure: Number(current.pressure_msl || 0),
      wind: Number(current.wind_speed_10m || 0),
      windDirection: Number(current.wind_direction_10m || 0),
      visibility: Number.isFinite(visibilityKm) ? Number(visibilityKm.toFixed(1)) : 0,
    },
    forecast,
    trendData,
    rainfallProbability,
    droughtRisk,
    droughtLevel,
    soilMoisture: clamp(Math.round(soilMoisture), 0, 100),
    evapotranspiration: Number(evapotranspiration.toFixed(1)),
    alerts,
    plantingWindows: [
      {
        label: "Best planting window",
        value: plantingWindow,
        detail:
          rainfallProbability > 55
            ? "Forecast rainfall supports establishment for moisture-responsive crops."
            : "Wait for stronger rainfall recharge before sensitive seed placement.",
      },
      {
        label: "Microclimate",
        value: farm.location?.label || `${farm.region} field zone`,
        detail: `Live coordinates weather pulled from ${farm.location?.lat.toFixed(2)}, ${farm.location?.lng.toFixed(2)}.`,
      },
      {
        label: "Primary crop guidance",
        value: farm.primaryCrop || "General mixed crop",
        detail:
          droughtRisk > 55
            ? "Favor drought-tolerant scheduling and moisture conservation practices."
            : "Current weather supports steady in-season crop development.",
      },
    ],
    seasonalForecast: {
      quarter: "Seasonal outlook",
      narrative:
        rainfallProbability > 58
          ? "The latest forecast shows stronger rainfall support than usual, opening better planting windows for medium-cycle crops."
          : "Rainfall remains variable, so staggered planting and moisture conservation remain important.",
      expectedRainfall: `${Math.round(last30DaysRain * 0.8)}-${Math.round(last30DaysRain * 1.2)} mm`,
      temperatureAnomaly: `${anomaly >= 0 ? "+" : ""}${anomaly.toFixed(1)} C`,
      window:
        rainfallProbability > 55
          ? "Planting window is open for moisture-responsive crops."
          : "Use short-cycle or drought-tolerant crops until rainfall improves.",
    },
    updateTimestamp: current.time || new Date().toISOString(),
    dataSources: [
      { label: "Open-Meteo forecast API", detail: "Current and 7-day forecast feed" },
      { label: "Open-Meteo archive API", detail: "Historical daily temperature and rainfall data" },
    ],
  };
}

export function WeatherPage() {
  const { currentFarms } = useFarmerData();
  const farmOptions = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const [selectedFarmId, setSelectedFarmId] = useState(farmOptions[0]?.id || "default-weather-location");
  const [selectedRange, setSelectedRange] = useState("6M");
  const [weather, setWeather] = useState(() => createFallbackWeatherDataset(farmOptions[0]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!farmOptions.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farmOptions[0]?.id || "default-weather-location");
    }
  }, [farmOptions, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farmOptions.find((farm) => farm.id === selectedFarmId) || farmOptions[0],
    [farmOptions, selectedFarmId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
        setWeather(createFallbackWeatherDataset(selectedFarm));
        setLoading(false);
        setError("Selected farm has no saved GPS location. Showing local fallback weather.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        const [forecastResponse, archiveResponse] = await Promise.all([
          apiClient.weather.forecast(selectedFarm.location.lat, selectedFarm.location.lng),
          apiClient.weather.archive(
            selectedFarm.location.lat,
            selectedFarm.location.lng,
            isoDate(oneYearAgo),
            isoDate(today)
          ),
        ]);

        if (cancelled) return;

        setWeather(transformOpenMeteoToDataset(selectedFarm, forecastResponse, archiveResponse));
      } catch (loadError) {
        if (cancelled) return;
        setWeather(createFallbackWeatherDataset(selectedFarm));
        setError("Live weather could not be loaded right now. Showing fallback weather insights.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, [selectedFarm]);

  const selectedTrend = weather.trendData[selectedRange] || weather.trendData["6M"];
  const trendLine = buildSeriesPoints(selectedTrend.temperature);
  const rainLine = buildSeriesPoints(selectedTrend.rainfall);
  const areaPath = buildAreaPath(selectedTrend.temperature);

  return (
    <section className="management-page prototype-weather-module">
      <div className="prototype-weather-toolbar">
        <div className="page-title-block">
          <h1>Weather &amp; Climate Analysis</h1>
          <p>
            Live weather monitoring, climate pattern analysis, and microclimate insights for
            your registered farms.
          </p>
        </div>

        <div className="prototype-weather-toolbar-actions">
          <label className="prototype-weather-location-picker">
            <span>Farm location</span>
            <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
              {farmOptions.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} - {farm.region}
                </option>
              ))}
            </select>
          </label>

          <div className="prototype-weather-source-note">
            <MapPin size={16} />
            <span>
              {weather.farm.location?.label || weather.farm.region} ({weather.farm.location?.lat.toFixed(2)},
              {" "}{weather.farm.location?.lng.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {loading ? <div className="prototype-weather-status">Loading live weather data...</div> : null}
      {error ? <div className="prototype-weather-status warning">{error}</div> : null}

      <div className="prototype-weather-grid">
        <article className="prototype-panel weather-current-card">
          <div className="weather-current-head">
            <div>
              <span className="weather-live-badge">Current conditions</span>
              <h2>{weather.farm.name}</h2>
              <p>{weather.current.condition}</p>
            </div>
            <div className="weather-current-temp">
              <CloudSun size={34} />
              <strong>{formatDegrees(weather.current.temperature)}</strong>
            </div>
          </div>

          <div className="weather-current-metrics">
            <div>
              <span>
                <Thermometer size={16} />
                Temperature
              </span>
              <strong>{formatDegrees(weather.current.temperature)}</strong>
            </div>
            <div>
              <span>
                <CloudRain size={16} />
                Rainfall
              </span>
              <strong>{weather.current.rainfall} mm</strong>
            </div>
            <div>
              <span>
                <Droplets size={16} />
                Humidity
              </span>
              <strong>{weather.current.humidity}%</strong>
            </div>
            <div>
              <span>
                <Wind size={16} />
                Wind
              </span>
              <strong>
                {weather.current.wind} km/h {formatWindDirection(weather.current.windDirection)}
              </strong>
            </div>
            <div>
              <span>
                <Gauge size={16} />
                Pressure
              </span>
              <strong>{weather.current.pressure} hPa</strong>
            </div>
            <div>
              <span>
                <Eye size={16} />
                Visibility
              </span>
              <strong>{weather.current.visibility} km</strong>
            </div>
          </div>
        </article>

        <aside className="prototype-panel weather-alert-card">
          <div className="weather-panel-heading">
            <h2>
              <AlertTriangle size={18} />
              Weather alerts
            </h2>
            <span>{weather.alerts.length} active</span>
          </div>

          <div className="weather-alert-list">
            {weather.alerts.map((alert) => (
              <article key={alert.id} className={`weather-alert-item ${alert.severity}`}>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </article>
            ))}
          </div>
        </aside>

        <section className="prototype-panel weather-forecast-card">
          <div className="weather-panel-heading">
            <h2>
              <CalendarDays size={18} />
              7-day forecast
            </h2>
            <span>Open-Meteo live feed</span>
          </div>

          <div className="weather-forecast-grid">
            {weather.forecast.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.day} className={`weather-forecast-day ${item.label === "Today" ? "active" : ""}`}>
                  <span>{item.day}</span>
                  <small>{item.label}</small>
                  <Icon size={24} />
                  <strong>{formatDegrees(item.high)}</strong>
                  <p>{item.condition}</p>
                  <div className="weather-forecast-meta">
                    <em>{item.rainChance}% rain</em>
                    <em>{item.humidity}% humidity</em>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="prototype-panel weather-seasonal-card">
          <div className="weather-panel-heading">
            <h2>
              <Sprout size={18} />
              Seasonal forecast &amp; planting windows
            </h2>
            <span>{weather.seasonalForecast.quarter}</span>
          </div>

          <p>{weather.seasonalForecast.narrative}</p>
          <div className="weather-seasonal-summary">
            <div>
              <span>Expected rainfall</span>
              <strong>{weather.seasonalForecast.expectedRainfall}</strong>
            </div>
            <div>
              <span>Temperature anomaly</span>
              <strong>{weather.seasonalForecast.temperatureAnomaly}</strong>
            </div>
          </div>
          <div className="weather-recommendation-box">
            <strong>Planting window guidance</strong>
            <p>{weather.seasonalForecast.window}</p>
          </div>

          <div className="weather-window-grid">
            {weather.plantingWindows.map((window) => (
              <article key={window.label} className="weather-window-card">
                <span>{window.label}</span>
                <strong>{window.value}</strong>
                <p>{window.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="prototype-panel weather-trend-card">
          <div className="weather-panel-heading">
            <h2>
              <Waves size={18} />
              Historical climate trend
            </h2>
            <div className="weather-range-switch">
              {["1M", "6M", "1Y"].map((range) => (
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
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d={areaPath} className="weather-trend-area" />
              <path d={trendLine} className="weather-trend-line" />
              <path d={rainLine} className="weather-trend-rain" />
            </svg>
            <div className="weather-trend-axis">
              {selectedTrend.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="weather-trend-legend">
              <span>
                <i className="solid" />
                Temperature pattern
              </span>
              <span>
                <i className="dashed" />
                Rainfall history
              </span>
            </div>
          </div>
        </section>

        <div className="weather-indicator-grid">
          <article className="prototype-panel weather-indicator-card">
            <span>Rainfall probability</span>
            <strong>{weather.rainfallProbability}%</strong>
            <div className="weather-progress-track">
              <div style={{ width: `${weather.rainfallProbability}%` }} />
            </div>
            <p>Higher precipitation probability supports upcoming field establishment.</p>
          </article>

          <article className="prototype-panel weather-indicator-card">
            <span>Drought risk</span>
            <strong>{weather.droughtRisk}%</strong>
            <div className="weather-progress-track warning">
              <div style={{ width: `${weather.droughtRisk}%` }} />
            </div>
            <p>{weather.droughtLevel} risk based on recent rainfall and surface moisture trends.</p>
          </article>

          <article className="prototype-panel weather-indicator-card">
            <span>Soil moisture</span>
            <strong>{weather.soilMoisture}%</strong>
            <div className="weather-progress-track blue">
              <div style={{ width: `${weather.soilMoisture}%` }} />
            </div>
            <p>Useful for microclimate-specific irrigation timing on each saved farm.</p>
          </article>

          <article className="prototype-panel weather-indicator-card">
            <span>Evapotranspiration</span>
            <strong>{weather.evapotranspiration} mm/day</strong>
            <div className="weather-sources-list compact">
              <div>
                <ShieldAlert size={16} />
                <span>Adverse weather alerts stay linked to this selected location.</span>
              </div>
            </div>
          </article>
        </div>

        <footer className="prototype-panel weather-footer-card">
          <div className="weather-footer-meta">
            <div>
              <span>Data sources</span>
              <strong>
                {weather.dataSources.map((source) => source.label).join(" + ")}
              </strong>
            </div>
            <div>
              <span>Last updated</span>
              <strong>{formatDateTime(weather.updateTimestamp)}</strong>
            </div>
          </div>

          <div className="weather-sources-list">
            {weather.dataSources.map((source) => (
              <div key={source.label}>
                <MoveRight size={16} />
                <span>
                  <strong>{source.label}:</strong> {source.detail}
                </span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </section>
  );
}
