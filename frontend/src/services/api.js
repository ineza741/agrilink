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

async function requestJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOpenMeteoForecast(latitude, longitude) {
  const url = buildUrl(FORECAST_BASE_URL, {
    latitude,
    longitude,
    timezone: "auto",
    forecast_days: 7,
    past_days: 7,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "visibility",
      "soil_moisture_0_to_1cm",
      "et0_fao_evapotranspiration",
      "weather_code",
    ],
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "et0_fao_evapotranspiration",
    ],
  });

  return requestJson(url);
}

export async function getOpenMeteoArchive(latitude, longitude, startDate, endDate) {
  const url = buildUrl(ARCHIVE_BASE_URL, {
    latitude,
    longitude,
    timezone: "auto",
    start_date: startDate,
    end_date: endDate,
    daily: ["temperature_2m_mean", "precipitation_sum"],
  });

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
