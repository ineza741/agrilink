const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_BASE_URL = "https://archive-api.open-meteo.com/v1/archive";
const SOILGRIDS_BASE_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query";

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

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export function buildOpenMeteoForecastUrl(latitude, longitude) {
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

export async function getOpenMeteoForecast(latitude, longitude) {
  const url = buildOpenMeteoForecastUrl(latitude, longitude);

  return requestJson(url);
}

export function buildOpenMeteoArchiveUrl(latitude, longitude, startDate, endDate) {
  return buildUrl(ARCHIVE_BASE_URL, {
    latitude,
    longitude,
    timezone: "Africa/Kigali",
    start_date: startDate,
    end_date: endDate,
    daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
  });
}

export async function getOpenMeteoArchive(latitude, longitude, startDate, endDate) {
  const url = buildOpenMeteoArchiveUrl(latitude, longitude, startDate, endDate);

  return requestJson(url);
}

export async function getSoilGridsEstimate(latitude, longitude) {
  const pluralUrl = buildUrl(SOILGRIDS_BASE_URL, {
    lat: latitude,
    lon: longitude,
    properties: ["phh2o", "nitrogen", "soc", "clay", "sand", "silt", "cec"],
    depths: "0-5cm",
    values: "mean",
  });

  try {
    return await requestJson(pluralUrl);
  } catch {
    const legacyUrl = buildUrl(SOILGRIDS_BASE_URL, {
      lat: latitude,
      lon: longitude,
      property: ["phh2o", "nitrogen", "soc", "clay", "sand", "silt", "cec"],
      depth: "0-5cm",
      value: "mean",
    });

    return requestJson(legacyUrl);
  }
}

export const apiClient = {
  get: async (url) => requestJson(url),
  weather: {
    forecast: getOpenMeteoForecast,
    archive: getOpenMeteoArchive,
  },
  soil: {
    estimate: getSoilGridsEstimate,
  },
};
