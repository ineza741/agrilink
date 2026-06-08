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

function hashFarm(farm) {
  const latSeed = Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100);
  const lngSeed = Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100);
  const mapSeed = Number(farm?.location?.mapX || 0) + Number(farm?.location?.mapY || 0);
  const sizeSeed = Math.round(Number(farm?.sizeHectares || 0));
  return latSeed + lngSeed + mapSeed + sizeSeed;
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

function createWeatherDataset(farm) {
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

  const severeHeat = forecast.some((item) => item.high >= 34);
  const heavyRain = forecast.some((item) => item.rainChance >= 78);
  const lowHumidity = humidity <= 52;
  const droughtAlert = droughtRisk >= 60;

  const alerts = [
    severeHeat
      ? {
          id: "heatwave",
          type: "heatwave",
          title: "Heatwave advisory",
          message: "Daytime temperatures are projected to stay above 34 C. Increase irrigation frequency and field scouting.",
          severity: "high",
        }
      : null,
    heavyRain
      ? {
          id: "rainfall",
          type: "heavy-rain",
          title: "Heavy rain watch",
          message: "Strong rainfall probability within the next 72 hours. Delay fertilizer top-dressing and inspect drainage channels.",
          severity: "medium",
        }
      : null,
    lowHumidity
      ? {
          id: "humidity",
          type: "dry-air",
          title: "Low humidity notice",
          message: "Dry air conditions may raise transpiration stress for young crops during midday hours.",
          severity: "medium",
        }
      : null,
    droughtAlert
      ? {
          id: "drought",
          type: "drought",
          title: "Drought risk trigger",
          message: "Seasonal rainfall deficit is widening for this microclimate. Prioritize drought-tolerant planting windows.",
          severity: "high",
        }
      : null,
  ].filter(Boolean);

  const plantingWindows = [
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
      detail: `Localized offset ${microclimateOffset >= 0 ? "+" : ""}${microclimateOffset.toFixed(1)} C compared with the regional baseline.`,
    },
    {
      label: "Primary crop guidance",
      value: sourceFarm.primaryCrop || "General mixed crop",
      detail:
        droughtRisk > 55
          ? "Favor conservation tillage and staggered planting blocks."
          : "Field conditions are suitable for steady vegetative growth.",
    },
  ];

  const seasonalForecast = {
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
  };

  return {
    farm: sourceFarm,
    current: {
      temperature: currentTemp,
      rainfall,
      humidity,
      condition: rainfallProbability > 62 ? "Partly cloudy with rainfall build-up" : "Dry, stable conditions",
      pressure,
      wind,
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
    plantingWindows,
    seasonalForecast,
    updateTimestamp,
    dataSources: [
      { label: "Local station API", detail: "Northern Highlands AgroMet Station" },
      { label: "Global forecast model", detail: "WMO seasonal ensemble feed" },
    ],
  };
}

export function WeatherPage() {
  const { currentFarms } = useFarmerData();
  const farmOptions = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const [selectedFarmId, setSelectedFarmId] = useState(farmOptions[0]?.id || "default-weather-location");
  const [selectedRange, setSelectedRange] = useState("6M");

  useEffect(() => {
    if (!farmOptions.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farmOptions[0]?.id || "default-weather-location");
    }
  }, [farmOptions, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farmOptions.find((farm) => farm.id === selectedFarmId) || farmOptions[0],
    [farmOptions, selectedFarmId]
  );

  const weather = useMemo(() => createWeatherDataset(selectedFarm), [selectedFarm]);
  const selectedTrend = weather.trendData[selectedRange];
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
              <strong>{weather.current.wind} km/h</strong>
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
            <span>Microclimate adjusted</span>
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
            <p>{weather.droughtLevel} risk based on rainfall deficit and soil moisture trend.</p>
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
