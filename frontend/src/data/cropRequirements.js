export const CROP_REQUIREMENTS = [
  { name: "Maize", minRain: 20, idealTempMin: 18, idealTempMax: 30 },
  { name: "Beans", minRain: 15, idealTempMin: 18, idealTempMax: 28 },
  { name: "Irish Potato", minRain: 18, idealTempMin: 15, idealTempMax: 24 },
  { name: "Rice", minRain: 30, idealTempMin: 20, idealTempMax: 35 },
  { name: "Sorghum", minRain: 10, idealTempMin: 20, idealTempMax: 32 },
  { name: "Cassava", minRain: 12, idealTempMin: 20, idealTempMax: 32 },
  { name: "Tomato", minRain: 15, idealTempMin: 18, idealTempMax: 27 },
  { name: "Banana", minRain: 25, idealTempMin: 20, idealTempMax: 30 },
];

export function findCropRequirements(name) {
  if (!name) return null;
  return CROP_REQUIREMENTS.find((c) => c.name === name) || null;
}
