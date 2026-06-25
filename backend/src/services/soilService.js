const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const cropLibrary = [
  {
    name: "Maize",
    preferredTexture: ["Loamy", "Sandy Loam"],
    phRange: [5.8, 7.0],
    minOrganicMatter: 2.4,
    targets: { n: 55, p: 28, k: 26 },
  },
  {
    name: "Beans",
    preferredTexture: ["Loamy", "Silty"],
    phRange: [6.0, 7.2],
    minOrganicMatter: 2.0,
    targets: { n: 20, p: 16, k: 18 },
  },
  {
    name: "Irish Potato",
    preferredTexture: ["Sandy Loam", "Loamy"],
    phRange: [5.2, 6.6],
    minOrganicMatter: 3.0,
    targets: { n: 38, p: 30, k: 36 },
  },
  {
    name: "Soybean",
    preferredTexture: ["Loamy", "Silty"],
    phRange: [6.0, 7.4],
    minOrganicMatter: 2.2,
    targets: { n: 22, p: 18, k: 20 },
  },
  {
    name: "Sorghum",
    preferredTexture: ["Sandy Loam", "Loamy"],
    phRange: [5.6, 7.5],
    minOrganicMatter: 1.8,
    targets: { n: 30, p: 18, k: 16 },
  },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildFarmInclude() {
  return {
    farmerProfile: {
      include: {
        user: true,
      },
    },
  };
}

async function getFarmForSoilAccess(user, farmId) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: buildFarmInclude(),
  });

  if (!farm) {
    throw new ApiError(404, "Farm not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = farm.farmerProfile?.userId === user.id;

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to access soil records for this farm.");
  }

  return farm;
}

async function getSoilTestForAccess(user, soilTestId) {
  const soilTest = await prisma.soilTest.findUnique({
    where: { id: soilTestId },
    include: {
      farm: {
        include: buildFarmInclude(),
      },
      labReport: true,
      suitabilityResults: {
        orderBy: {
          suitabilityScore: "desc",
        },
      },
      fertilizerRecommendations: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!soilTest) {
    throw new ApiError(404, "Soil test not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = soilTest.farm?.farmerProfile?.userId === user.id;

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to access this soil test.");
  }

  return soilTest;
}

function computeHealthScore(payload) {
  const phScore = 100 - Math.min(Math.abs(Number(payload.ph) - 6.5) * 18, 42);
  const nScore = clamp((Number(payload.nitrogen) / 55) * 100, 0, 100);
  const pScore = clamp((Number(payload.phosphorus) / 30) * 100, 0, 100);
  const kScore = clamp((Number(payload.potassium) / 35) * 100, 0, 100);
  const omScore = clamp((Number(payload.organicMatter) / 4.2) * 100, 0, 100);
  const textureBonus =
    payload.texture === "Loamy" ? 10 : payload.texture === "Sandy Loam" ? 6 : payload.texture === "Clay Loam" ? 4 : 3;

  const score = Math.round(clamp((phScore + nScore + pScore + kScore + omScore) / 5 + textureBonus, 18, 96));
  const label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Moderate" : "Low";

  return { score, label };
}

function buildSuitabilityResults(soilTest, farm) {
  return cropLibrary
    .map((crop) => {
      const limitingFactors = [];
      let score = 45;

      if (crop.preferredTexture.includes(soilTest.texture)) {
        score += 18;
      } else {
        limitingFactors.push(`Texture is not ideal for ${crop.name}.`);
      }

      if (soilTest.ph >= crop.phRange[0] && soilTest.ph <= crop.phRange[1]) {
        score += 18;
      } else {
        limitingFactors.push(`pH is outside ${crop.name}'s preferred range (${crop.phRange[0]}-${crop.phRange[1]}).`);
      }

      if (soilTest.nitrogen >= crop.targets.n) {
        score += 10;
      } else {
        limitingFactors.push("Nitrogen is below the preferred threshold.");
      }

      if (soilTest.phosphorus >= crop.targets.p) {
        score += 8;
      } else {
        limitingFactors.push("Phosphorus is below the preferred threshold.");
      }

      if (soilTest.potassium >= crop.targets.k) {
        score += 8;
      } else {
        limitingFactors.push("Potassium is below the preferred threshold.");
      }

      if (soilTest.organicMatter >= crop.minOrganicMatter) {
        score += 10;
      } else {
        limitingFactors.push("Organic matter is below the crop preference.");
      }

      if ((farm.currentCrop || "").toLowerCase().includes(crop.name.toLowerCase())) {
        score += 6;
      }

      const suitabilityScore = clamp(Math.round(score), 35, 98);
      const suitabilityBand =
        suitabilityScore >= 85 ? "Best Fit" : suitabilityScore >= 70 ? "Good Fit" : "Needs Adjustment";
      const recommendationSummary =
        suitabilityScore >= 85
          ? `${crop.name} is well aligned with the current soil profile.`
          : suitabilityScore >= 70
            ? `${crop.name} is viable with a few nutrient corrections before planting.`
            : `${crop.name} should only be planted after targeted soil improvement.`;

      return {
        cropName: crop.name,
        suitabilityScore,
        suitabilityBand,
        recommendationSummary,
        limitingFactors,
      };
    })
    .sort((left, right) => right.suitabilityScore - left.suitabilityScore);
}

function buildFertilizerRecommendation(soilTest) {
  const nitrogenKgHa = Number(clamp((42 - Number(soilTest.nitrogen)) * 1.35, 0, 68).toFixed(1));
  const phosphorusKgHa = Number(clamp((24 - Number(soilTest.phosphorus)) * 1.25, 0, 52).toFixed(1));
  const potassiumKgHa = Number(clamp((24 - Number(soilTest.potassium)) * 1.2, 0, 58).toFixed(1));

  const recommendedBlend =
    nitrogenKgHa > 30
      ? "Urea + compost manure"
      : phosphorusKgHa > 20
        ? "DAP or TSP blend"
        : potassiumKgHa > 20
          ? "MOP / Sulphate of Potash"
          : "Maintenance nutrition only";

  const applicationTiming = [
    nitrogenKgHa > 0 ? "Apply nitrogen during vegetative growth in split doses." : null,
    phosphorusKgHa > 0 ? "Apply phosphorus before planting or near the root zone." : null,
    potassiumKgHa > 0 ? "Apply potassium during root bulking, tuber formation, or fruiting." : null,
  ]
    .filter(Boolean)
    .join(" ");

  const budgetNote =
    nitrogenKgHa + phosphorusKgHa + potassiumKgHa > 90
      ? "High nutrient correction required. Consider phased application if budget is constrained."
      : "Nutrient correction is moderate and can fit a standard seasonal input plan.";

  const recommendationSummary =
    nitrogenKgHa || phosphorusKgHa || potassiumKgHa
      ? "Fertilizer guidance generated from soil test values and nutrient deficiency thresholds."
      : "Current nutrient balance is healthy. Maintain the existing fertility program.";

  return {
    nitrogenKgHa,
    phosphorusKgHa,
    potassiumKgHa,
    recommendedBlend,
    applicationTiming,
    budgetNote,
    recommendationSummary,
  };
}

function mapSoilTestRecord(record) {
  if (!record) return null;

  const latestSuitability = Array.isArray(record.suitabilityResults) ? record.suitabilityResults : [];
  const latestFertilizer = Array.isArray(record.fertilizerRecommendations)
    ? record.fertilizerRecommendations[0] || null
    : null;
  const health = computeHealthScore(record);

  return {
    id: record.id,
    farmId: record.farmId,
    sourceType: record.sourceType,
    ph: record.ph,
    nitrogen: record.nitrogen,
    phosphorus: record.phosphorus,
    potassium: record.potassium,
    organicMatter: record.organicMatter,
    texture: record.texture,
    notes: record.notes,
    analysisStatus: record.analysisStatus,
    regionContext: record.regionContext,
    districtContext: record.districtContext,
    sectorContext: record.sectorContext,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    analyzedAt: record.analyzedAt,
    healthScore: health.score,
    healthLabel: health.label,
    labReport: record.labReport || null,
    suitabilityResults: latestSuitability,
    fertilizerRecommendation: latestFertilizer,
  };
}

async function createSoilTest(user, payload) {
  const farm = await getFarmForSoilAccess(user, payload.farmId);

  const soilTest = await prisma.soilTest.create({
    data: {
      farmId: payload.farmId,
      sourceType: payload.sourceType || (payload.labReport ? "uploaded" : "manual"),
      ph: Number(payload.ph),
      nitrogen: Number(payload.nitrogen),
      phosphorus: Number(payload.phosphorus),
      potassium: Number(payload.potassium),
      organicMatter: Number(payload.organicMatter),
      texture: payload.texture,
      notes: payload.notes || null,
      regionContext: farm.province,
      districtContext: farm.district,
      sectorContext: farm.sector,
      labReport: payload.labReport
        ? {
            create: {
              fileName: payload.labReport.fileName,
              fileType: payload.labReport.fileType || null,
              storageMode: payload.labReport.storageMode || "demo-local",
            },
          }
        : undefined,
    },
    include: {
      labReport: true,
      suitabilityResults: true,
      fertilizerRecommendations: true,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "CREATE_SOIL_TEST",
    entityType: "SoilTest",
    entityId: soilTest.id,
    details: { farmId: payload.farmId, sourceType: soilTest.sourceType },
  });

  return mapSoilTestRecord(soilTest);
}

async function listSoilTestsByFarm(user, farmId) {
  await getFarmForSoilAccess(user, farmId);

  const rows = await prisma.soilTest.findMany({
    where: { farmId },
    include: {
      labReport: true,
      suitabilityResults: {
        orderBy: {
          suitabilityScore: "desc",
        },
      },
      fertilizerRecommendations: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return rows.map(mapSoilTestRecord);
}

async function updateSoilTest(user, soilTestId, payload) {
  const existing = await getSoilTestForAccess(user, soilTestId);

  const updated = await prisma.soilTest.update({
    where: { id: soilTestId },
    data: {
      ...(payload.sourceType ? { sourceType: payload.sourceType } : {}),
      ...(payload.ph !== undefined ? { ph: Number(payload.ph) } : {}),
      ...(payload.nitrogen !== undefined ? { nitrogen: Number(payload.nitrogen) } : {}),
      ...(payload.phosphorus !== undefined ? { phosphorus: Number(payload.phosphorus) } : {}),
      ...(payload.potassium !== undefined ? { potassium: Number(payload.potassium) } : {}),
      ...(payload.organicMatter !== undefined ? { organicMatter: Number(payload.organicMatter) } : {}),
      ...(payload.texture ? { texture: payload.texture } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
      ...(payload.labReport
        ? {
            labReport: {
              upsert: {
                update: {
                  fileName: payload.labReport.fileName,
                  fileType: payload.labReport.fileType || null,
                  storageMode: payload.labReport.storageMode || "demo-local",
                },
                create: {
                  fileName: payload.labReport.fileName,
                  fileType: payload.labReport.fileType || null,
                  storageMode: payload.labReport.storageMode || "demo-local",
                },
              },
            },
          }
        : {}),
      analysisStatus:
        payload.ph !== undefined ||
        payload.nitrogen !== undefined ||
        payload.phosphorus !== undefined ||
        payload.potassium !== undefined ||
        payload.organicMatter !== undefined ||
        payload.texture
          ? "Pending"
          : existing.analysisStatus,
    },
    include: {
      labReport: true,
      suitabilityResults: {
        orderBy: {
          suitabilityScore: "desc",
        },
      },
      fertilizerRecommendations: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_SOIL_TEST",
    entityType: "SoilTest",
    entityId: soilTestId,
    details: payload,
  });

  return mapSoilTestRecord(updated);
}

async function deleteSoilTest(user, soilTestId) {
  const existing = await getSoilTestForAccess(user, soilTestId);

  await prisma.soilTest.delete({
    where: { id: soilTestId },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "DELETE_SOIL_TEST",
    entityType: "SoilTest",
    entityId: soilTestId,
    details: { farmId: existing.farmId },
  });

  return { deleted: true, id: soilTestId };
}

async function analyzeSoilTest(user, soilTestId) {
  const existing = await getSoilTestForAccess(user, soilTestId);
  const farm = existing.farm;

  const suitabilityResults = buildSuitabilityResults(existing, farm);
  const fertilizer = buildFertilizerRecommendation(existing);
  const health = computeHealthScore(existing);

  await prisma.$transaction([
    prisma.cropSuitabilityResult.deleteMany({
      where: { soilTestId },
    }),
    prisma.fertilizerRecommendation.deleteMany({
      where: { soilTestId },
    }),
    prisma.soilTest.update({
      where: { id: soilTestId },
      data: {
        analysisStatus: "Analyzed",
        analyzedAt: new Date(),
      },
    }),
    prisma.cropSuitabilityResult.createMany({
      data: suitabilityResults.map((item) => ({
        soilTestId,
        farmId: existing.farmId,
        cropName: item.cropName,
        suitabilityScore: item.suitabilityScore,
        suitabilityBand: item.suitabilityBand,
        recommendationSummary: item.recommendationSummary,
        limitingFactors: item.limitingFactors,
      })),
    }),
    prisma.fertilizerRecommendation.create({
      data: {
        soilTestId,
        farmId: existing.farmId,
        nitrogenKgHa: fertilizer.nitrogenKgHa,
        phosphorusKgHa: fertilizer.phosphorusKgHa,
        potassiumKgHa: fertilizer.potassiumKgHa,
        recommendedBlend: fertilizer.recommendedBlend,
        applicationTiming: fertilizer.applicationTiming,
        budgetNote: fertilizer.budgetNote,
        recommendationSummary: fertilizer.recommendationSummary,
      },
    }),
  ]);

  const analyzed = await prisma.soilTest.findUnique({
    where: { id: soilTestId },
    include: {
      labReport: true,
      suitabilityResults: {
        orderBy: {
          suitabilityScore: "desc",
        },
      },
      fertilizerRecommendations: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "ANALYZE_SOIL_TEST",
    entityType: "SoilTest",
    entityId: soilTestId,
    details: {
      farmId: existing.farmId,
      topCrop: suitabilityResults[0]?.cropName || null,
      healthScore: health.score,
    },
  });

  return {
    soilTest: mapSoilTestRecord(analyzed),
    healthScore: health.score,
    healthLabel: health.label,
    suitabilityResults: analyzed.suitabilityResults,
    fertilizerRecommendation: analyzed.fertilizerRecommendations[0] || null,
  };
}

async function getCropSuitabilityByFarm(user, farmId) {
  await getFarmForSoilAccess(user, farmId);

  const latestSoilTest = await prisma.soilTest.findFirst({
    where: { farmId },
    include: {
      labReport: true,
      suitabilityResults: {
        orderBy: {
          suitabilityScore: "desc",
        },
      },
      fertilizerRecommendations: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestSoilTest) {
    return {
      latestSoilTest: null,
      suitabilityResults: [],
      fertilizerRecommendation: null,
    };
  }

  return {
    latestSoilTest: mapSoilTestRecord(latestSoilTest),
    suitabilityResults: latestSoilTest.suitabilityResults,
    fertilizerRecommendation: latestSoilTest.fertilizerRecommendations[0] || null,
  };
}

module.exports = {
  createSoilTest,
  listSoilTestsByFarm,
  updateSoilTest,
  deleteSoilTest,
  analyzeSoilTest,
  getCropSuitabilityByFarm,
};
