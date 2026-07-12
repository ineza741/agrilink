const prisma = require("../prisma/client");
const { normalizeDistrict } = require("../utils/districtNormalizer");
const { calculateDistanceKm } = require("../utils/distanceCalculator");
const { RWANDA_MARKETS } = require("../data/rwandaMarkets");

const PRICE_TYPE_FIELD = {
  Wholesale: "wholesalePrice",
  Retail: "retailPrice",
  "Farm Gate": "farmGatePrice",
};

async function importMarketDirectory() {
  const existingCount = await prisma.market.count();
  if (existingCount > 0) return { skipped: true, count: existingCount };

  const records = RWANDA_MARKETS.map((m) => ({
    marketName: m.marketName,
    province: m.province,
    district: m.district,
    sector: m.sector || null,
    latitude: m.latitude || null,
    longitude: m.longitude || null,
    marketType: m.marketType || "District Market",
    active: true,
    dataSourceName: "Rwanda Agriculture Market Directory",
    dataSourceReference: "Verified from government sources and geographic data",
    verifiedAt: new Date(),
  }));

  await prisma.market.createMany({ data: records });

  await linkCropPricesToMarkets();

  return { imported: records.length };
}

async function linkCropPricesToMarkets() {
  const markets = await prisma.market.findMany({ where: { active: true } });
  const cropPrices = await prisma.cropPrice.findMany({
    where: { marketId: null },
    select: { id: true, marketName: true, district: true },
  });

  for (const price of cropPrices) {
    const normDistrict = normalizeDistrict(price.district);
    const matched = markets.find(
      (m) =>
        m.marketName === price.marketName &&
        normalizeDistrict(m.district) === normDistrict
    );
    if (matched) {
      await prisma.cropPrice.update({
        where: { id: price.id },
        data: { marketId: matched.id },
      });
    }
  }
}

async function getMarketsByDistrict(district, activeOnly = true) {
  const normDistrict = normalizeDistrict(district);
  const where = activeOnly ? { district: normDistrict, active: true } : { district: normDistrict };
  return prisma.market.findMany({ where, orderBy: [{ marketName: "asc" }] });
}

async function getMarketById(marketId) {
  return prisma.market.findUnique({ where: { id: marketId } });
}

async function getNearbyMarkets({ farmId, cropName, priceType = "Wholesale" }) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { id: true, farmName: true, district: true, sector: true, province: true, latitude: true, longitude: true },
  });

  if (!farm) {
    throw new Error("Farm not found.");
  }

  const normFarmDistrict = normalizeDistrict(farm.district);
  const priceField = PRICE_TYPE_FIELD[priceType] || "wholesalePrice";

  const districtMarkets = await prisma.market.findMany({
    where: { district: normFarmDistrict, active: true },
    orderBy: [{ marketName: "asc" }],
  });

  const marketIds = districtMarkets.map((m) => m.id);
  const officialPrices = marketIds.length
    ? await prisma.cropPrice.findMany({
        where: {
          marketId: { in: marketIds },
          cropName,
          status: "Active",
          [priceField]: { not: null },
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          updatedBy: { select: { id: true, fullName: true } },
        },
        orderBy: [{ effectiveDate: "desc" }, { updatedAt: "desc" }],
      })
    : [];

  const latestPriceByMarket = new Map();
  for (const price of officialPrices) {
    const key = price.marketId;
    if (!latestPriceByMarket.has(key)) {
      latestPriceByMarket.set(key, price);
    }
  }

  const historyIds = [...latestPriceByMarket.values()].map((p) => p.id);
  const histories = historyIds.length
    ? await prisma.cropPriceHistory.findMany({
        where: { cropPriceId: { in: historyIds } },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  const latestHistoryByPriceId = new Map();
  for (const h of histories) {
    if (!latestHistoryByPriceId.has(h.cropPriceId)) {
      latestHistoryByPriceId.set(h.cropPriceId, h);
    }
  }

  const farmLat = Number(farm.latitude);
  const farmLng = Number(farm.longitude);

  const resultMarkets = districtMarkets.map((market) => {
    const cropPrice = latestPriceByMarket.get(market.id);
    const history = cropPrice ? latestHistoryByPriceId.get(cropPrice.id) : null;
    const currentPrice = cropPrice && cropPrice[priceField] != null ? Number(cropPrice[priceField]) : null;

    let previousPrice = null;
    if (history) {
      const historyField = `old${priceField.charAt(0).toUpperCase() + priceField.slice(1)}`;
      const rawPrev = history[historyField] != null ? Number(history[historyField]) : null;
      previousPrice = rawPrev === 0 ? currentPrice : rawPrev;
    } else if (cropPrice?.previousPrice != null) {
      previousPrice = Number(cropPrice.previousPrice);
    }

    const percentageChange =
      previousPrice != null && currentPrice != null
        ? Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(1))
        : null;

    const distanceKm = calculateDistanceKm(farmLat, farmLng, Number(market.latitude), Number(market.longitude));
    const demandScore = currentPrice != null ? Math.min(97, Math.round(68 + (distanceKm != null ? (100 - distanceKm) * 0.15 : 0) + currentPrice / 150)) : 55;
    const accessibilityScore = distanceKm != null && distanceKm <= 5 ? 91 : distanceKm != null && distanceKm <= 15 ? 78 : 65;

    return {
      marketId: market.id,
      marketName: market.marketName,
      province: market.province,
      district: market.district,
      sector: market.sector,
      latitude: market.latitude,
      longitude: market.longitude,
      distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
      sameDistrict: true,
      currentPrice,
      previousPrice,
      percentageChange,
      priceType,
      currency: cropPrice?.currency || "RWF",
      unit: cropPrice?.unit || "kg",
      demandScore,
      accessibilityScore,
    };
  });

  const withPrice = resultMarkets.filter((m) => m.currentPrice != null);
  const withoutPrice = resultMarkets.filter((m) => m.currentPrice == null);

  withPrice.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm == null) return -1;
    if (a.distanceKm == null && b.distanceKm != null) return 1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (b.demandScore !== a.demandScore) return b.demandScore - a.demandScore;
    return b.accessibilityScore - a.accessibilityScore;
  });

  withoutPrice.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm == null) return -1;
    if (a.distanceKm == null && b.distanceKm != null) return 1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return a.marketName.localeCompare(b.marketName);
  });

  const districtMarketsSorted = [...withPrice, ...withoutPrice];

  let alternativeMarkets = [];
  if (districtMarketsSorted.length === 0 || withPrice.length === 0) {
    const sameProvinceMarkets = await prisma.market.findMany({
      where: {
        province: farm.province,
        district: { not: normFarmDistrict },
        active: true,
      },
      orderBy: [{ marketName: "asc" }],
    });

    const altMarketIds = sameProvinceMarkets.map((m) => m.id);
    const altPrices = altMarketIds.length
      ? await prisma.cropPrice.findMany({
          where: {
            marketId: { in: altMarketIds },
            cropName,
            status: "Active",
            [priceField]: { not: null },
          },
          orderBy: [{ effectiveDate: "desc" }, { updatedAt: "desc" }],
        })
      : [];

    const latestAltPriceByMarket = new Map();
    for (const p of altPrices) {
      if (!latestAltPriceByMarket.has(p.marketId)) {
        latestAltPriceByMarket.set(p.marketId, p);
      }
    }

    alternativeMarkets = sameProvinceMarkets.map((market) => {
      const cropPrice = latestAltPriceByMarket.get(market.id);
      const currentPrice = cropPrice && cropPrice[priceField] != null ? Number(cropPrice[priceField]) : null;
      const distanceKm = calculateDistanceKm(farmLat, farmLng, Number(market.latitude), Number(market.longitude));

      return {
        marketId: market.id,
        marketName: market.marketName,
        province: market.province,
        district: market.district,
        sector: market.sector,
        latitude: market.latitude,
        longitude: market.longitude,
        distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
        sameDistrict: false,
        currentPrice,
        priceType,
        currency: cropPrice?.currency || "RWF",
        unit: cropPrice?.unit || "kg",
      };
    }).filter((m) => m.currentPrice != null);

    alternativeMarkets.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm == null) return -1;
      if (a.distanceKm == null && b.distanceKm != null) return 1;
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      return a.marketName.localeCompare(b.marketName);
    });
  }

  const bestMarket = withPrice.length > 0 ? withPrice[0] : null;
  let bestMarketReason = null;
  if (bestMarket) {
    const parts = [];
    if (bestMarket.sameDistrict) {
      parts.push(`in the same district as the selected farm`);
    }
    if (bestMarket.distanceKm != null) {
      parts.push(`is ${bestMarket.distanceKm} km away`);
    }
    if (bestMarket.currentPrice != null) {
      parts.push(`has an official ${priceType.toLowerCase()} price of ${bestMarket.currency} ${Math.round(bestMarket.currentPrice).toLocaleString()}`);
    }
    bestMarketReason = `${bestMarket.marketName} is recommended because it ${parts.join(", ")}.`;
  }

  return {
    farm: {
      id: farm.id,
      name: farm.farmName,
      province: farm.province,
      district: farm.district,
      sector: farm.sector,
      latitude: farm.latitude,
      longitude: farm.longitude,
    },
    districtMarkets: districtMarketsSorted,
    alternativeMarkets,
    bestMarketId: bestMarket?.marketId || null,
    bestMarket,
    bestMarketReason,
    hasDistrictPrices: withPrice.length > 0,
  };
}

module.exports = {
  importMarketDirectory,
  linkCropPricesToMarkets,
  getMarketsByDistrict,
  getMarketById,
  getNearbyMarkets,
};
