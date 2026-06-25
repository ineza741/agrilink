const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const CONTENT_WORKFLOW = ["Draft", "Pending Review", "Approved", "Published", "Archived"];
const MODULE_TYPES = ["Crops", "Pests", "Advisory Logic", "Fertilizer Standards", "Advisory Templates"];
const CONTENT_LANGUAGE_OPTIONS = ["English", "Kinyarwanda", "French"];

const DEFAULT_CONTENT_ENTRIES = [
  {
    moduleType: "Crops",
    title: "Maize (Hybrid)",
    cycle: "120 Days",
    zone: "Bugesera & Eastern Belt",
    status: "Published",
    language: "English",
    metadata: {
      recommendedSoil: "Well-drained loam",
      optimalPh: "5.8 - 7.0",
      rainfallRange: "500 - 800 mm",
      yieldPotential: "6.2 t/ha",
      suitabilityScore: "92%",
    },
  },
  {
    moduleType: "Crops",
    title: "Irish Potato",
    cycle: "110 Days",
    zone: "Musanze Highlands",
    status: "Approved",
    language: "English",
    metadata: {
      recommendedSoil: "Volcanic loam",
      optimalPh: "5.2 - 6.4",
      rainfallRange: "700 - 1,200 mm",
      yieldPotential: "18 t/ha",
      suitabilityScore: "89%",
    },
  },
  {
    moduleType: "Crops",
    title: "Common Beans",
    cycle: "90 Days",
    zone: "Kicukiro & Huye",
    status: "Pending Review",
    language: "Kinyarwanda",
    metadata: {
      recommendedSoil: "Sandy loam",
      optimalPh: "6.0 - 7.2",
      rainfallRange: "350 - 600 mm",
      yieldPotential: "1.8 t/ha",
      suitabilityScore: "84%",
    },
  },
  {
    moduleType: "Crops",
    title: "Basmati Rice",
    cycle: "150 Days",
    zone: "Marshland blocks",
    status: "Draft",
    language: "French",
    metadata: {
      recommendedSoil: "Clay loam",
      optimalPh: "5.0 - 6.5",
      rainfallRange: "1,000 - 1,500 mm",
      yieldPotential: "5.1 t/ha",
      suitabilityScore: "79%",
    },
  },
  {
    moduleType: "Pests",
    title: "Fall Armyworm",
    cycle: "Larval escalation",
    zone: "Warm lowlands",
    status: "Published",
    language: "English",
    metadata: {
      affectedCrops: "Maize, sorghum",
      riskLevel: "High",
      treatmentRecommendation: "Scout twice weekly and apply biocontrol before severe leaf damage.",
      detectionConfidence: "91%",
    },
  },
  {
    moduleType: "Pests",
    title: "Late Blight",
    cycle: "Outbreak window",
    zone: "Cool wet highlands",
    status: "Approved",
    language: "English",
    metadata: {
      affectedCrops: "Irish potato, tomato",
      riskLevel: "High",
      treatmentRecommendation: "Improve canopy airflow and start copper-based fungicide before lesion spread.",
      detectionConfidence: "88%",
    },
  },
  {
    moduleType: "Pests",
    title: "Bean Aphid",
    cycle: "Early stage",
    zone: "Humid bean zones",
    status: "Pending Review",
    language: "Kinyarwanda",
    metadata: {
      affectedCrops: "Beans",
      riskLevel: "Medium",
      treatmentRecommendation: "Target field margins first and preserve beneficial predators.",
      detectionConfidence: "83%",
    },
  },
  {
    moduleType: "Advisory Logic",
    title: "Moisture Stress Rule",
    cycle: "Triggered",
    zone: "All Regions",
    status: "Published",
    language: "English",
    metadata: {
      trigger: "7-day rainfall < 10 mm",
      ruleScope: "Soil + weather + crop stage",
      confidence: "87%",
    },
  },
  {
    moduleType: "Advisory Logic",
    title: "Heatwave Escalation",
    cycle: "Triggered",
    zone: "Semi-Arid",
    status: "Approved",
    language: "French",
    metadata: {
      trigger: "Max temp >= 32C",
      ruleScope: "Weather + irrigation plan",
      confidence: "81%",
    },
  },
  {
    moduleType: "Advisory Logic",
    title: "Market Hold Recommendation",
    cycle: "Weekly review",
    zone: "District markets",
    status: "Draft",
    language: "English",
    metadata: {
      trigger: "Demand trend rising",
      ruleScope: "Market + storage readiness",
      confidence: "76%",
    },
  },
  {
    moduleType: "Fertilizer Standards",
    title: "Nitrogen Optimization",
    cycle: "Vegetative stage",
    zone: "Maize Belt",
    status: "Published",
    language: "English",
    metadata: {
      nutrientFocus: "Nitrogen",
      applicationTiming: "21-28 days after emergence",
      benchmark: "45 kg N/ha",
    },
  },
  {
    moduleType: "Fertilizer Standards",
    title: "Phosphorus Protocol",
    cycle: "Pre-planting",
    zone: "Highland Farms",
    status: "Pending Review",
    language: "French",
    metadata: {
      nutrientFocus: "Phosphorus",
      applicationTiming: "At planting",
      benchmark: "35 kg P2O5/ha",
    },
  },
  {
    moduleType: "Advisory Templates",
    title: "Drought Alert",
    category: "Climate",
    summary: "Prompt farmers to delay planting or conserve moisture during rainfall deficit periods.",
    language: "English",
    status: "Published",
    cycle: "7-day trigger",
    zone: "Semi-arid districts",
  },
  {
    moduleType: "Advisory Templates",
    title: "Pest Outbreak Alert",
    category: "Pests & Diseases",
    summary: "Escalate scouting and treatment actions when outbreak intensity rises above district threshold.",
    language: "English",
    status: "Approved",
    cycle: "Event-based",
    zone: "All districts",
  },
  {
    moduleType: "Advisory Templates",
    title: "Market Opportunity",
    category: "Market",
    summary: "Notify farmers when local demand and profitability improve for a target crop.",
    language: "Kinyarwanda",
    status: "Pending Review",
    cycle: "Weekly review",
    zone: "Market clusters",
  },
  {
    moduleType: "Advisory Templates",
    title: "Fertilizer Reminder",
    category: "Soil & Crop",
    summary: "Remind growers about stage-based NPK application timing before nutrient losses increase.",
    language: "French",
    status: "Draft",
    cycle: "Crop-stage",
    zone: "All farm profiles",
  },
  {
    moduleType: "Advisory Templates",
    title: "Harvest Advisory",
    category: "Harvest",
    summary: "Recommend harvest windows using crop maturity, rainfall outlook, and market demand.",
    language: "English",
    status: "Published",
    cycle: "Seasonal",
    zone: "Priority districts",
  },
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function formatReadableDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "19 Jun 2026";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildDefaultEntry(moduleType, label, language) {
  if (moduleType === "Crops") {
    return {
      moduleType,
      title: label,
      cycle: "120 Days",
      zone: "Regional",
      status: "Draft",
      language,
      metadata: {
        recommendedSoil: "Loamy soil",
        optimalPh: "5.8 - 6.8",
        rainfallRange: "500 - 900 mm",
        yieldPotential: "4.5 t/ha",
        suitabilityScore: "76%",
      },
    };
  }

  if (moduleType === "Pests") {
    return {
      moduleType,
      title: label,
      cycle: "Monitored",
      zone: "All districts",
      status: "Draft",
      language,
      metadata: {
        affectedCrops: "Pending assignment",
        riskLevel: "Medium",
        treatmentRecommendation: "Review scouting protocol before publishing treatment guidance.",
        detectionConfidence: "72%",
      },
    };
  }

  if (moduleType === "Advisory Templates") {
    return {
      moduleType,
      title: label,
      category: "General",
      summary: "New advisory template awaiting editorial review.",
      language,
      status: "Draft",
      cycle: "Manual review",
      zone: "All regions",
    };
  }

  if (moduleType === "Fertilizer Standards") {
    return {
      moduleType,
      title: label,
      cycle: "Pending review",
      zone: "System",
      status: "Draft",
      language,
      metadata: {
        nutrientFocus: "Balanced NPK",
        applicationTiming: "To be defined",
        benchmark: "TBD",
      },
    };
  }

  return {
    moduleType,
    title: label,
    cycle: "Draft",
    zone: "System",
    status: "Draft",
    language,
    metadata: {
      trigger: "Manual input",
      ruleScope: "Crop + weather",
      confidence: "70%",
    },
  };
}

function toAuditActionLabel(action = "") {
  const map = {
    CONTENT_ENTRY_CREATED: "Created content entry",
    CONTENT_ENTRY_STATUS_UPDATED: "Advanced content workflow",
    CONTENT_ENTRY_ARCHIVED: "Archived content entry",
    CONTENT_FERTILIZER_SYNC: "Synchronized fertilizer standards",
    CONTENT_SANDBOX_TESTED: "Tested advisory sandbox",
    CONTENT_SANDBOX_SAVED: "Saved advisory sandbox recommendation",
  };
  return map[action] || action.replace(/_/g, " ").toLowerCase();
}

function mapContentEntry(entry) {
  const metadata = entry.metadata || {};
  if (entry.moduleType === "Crops") {
    return {
      id: entry.id,
      crop: entry.title,
      cycle: entry.cycle,
      zone: entry.zone,
      status: entry.status,
      recommendedSoil: metadata.recommendedSoil || "",
      optimalPh: metadata.optimalPh || "",
      rainfallRange: metadata.rainfallRange || "",
      yieldPotential: metadata.yieldPotential || "",
      suitabilityScore: metadata.suitabilityScore || "",
      language: entry.language,
    };
  }

  if (entry.moduleType === "Pests") {
    return {
      id: entry.id,
      crop: entry.title,
      cycle: entry.cycle,
      zone: entry.zone,
      status: entry.status,
      affectedCrops: metadata.affectedCrops || "",
      riskLevel: metadata.riskLevel || "",
      treatmentRecommendation: metadata.treatmentRecommendation || "",
      detectionConfidence: metadata.detectionConfidence || "",
      language: entry.language,
    };
  }

  if (entry.moduleType === "Advisory Templates") {
    return {
      id: entry.id,
      name: entry.title,
      category: entry.category || "General",
      summary: entry.summary || "",
      language: entry.language,
      status: entry.status,
      cycle: entry.cycle,
      zone: entry.zone,
    };
  }

  if (entry.moduleType === "Fertilizer Standards") {
    return {
      id: entry.id,
      crop: entry.title,
      cycle: entry.cycle,
      zone: entry.zone,
      status: entry.status,
      nutrientFocus: metadata.nutrientFocus || "",
      applicationTiming: metadata.applicationTiming || "",
      benchmark: metadata.benchmark || "",
      language: entry.language,
    };
  }

  return {
    id: entry.id,
    crop: entry.title,
    cycle: entry.cycle,
    zone: entry.zone,
    status: entry.status,
    trigger: metadata.trigger || "",
    ruleScope: metadata.ruleScope || "",
    confidence: metadata.confidence || "",
    language: entry.language,
  };
}

function groupEntries(entries = []) {
  const grouped = Object.fromEntries(MODULE_TYPES.map((moduleType) => [moduleType, []]));
  entries.forEach((entry) => {
    if (!grouped[entry.moduleType]) grouped[entry.moduleType] = [];
    grouped[entry.moduleType].push(mapContentEntry(entry));
  });
  return grouped;
}

function computeSandboxOutput(input = {}) {
  const ph = Number(input.soilPh || 0);
  const nitrogen = Number(input.nitrogen || 0);
  const rainfall = Number(input.rainfall || 0);
  const temperature = Number(input.temperature || 0);
  const potassium = Number(input.potassium || 0);
  const phosphorus = Number(input.phosphorus || 0);
  const nutrientBalance = Math.round((nitrogen + phosphorus + potassium) / 3);
  const phScore = ph >= 5.5 && ph <= 6.8 ? 88 : 62;
  const rainfallScore = rainfall >= 12 && rainfall <= 35 ? 84 : rainfall < 12 ? 58 : 70;
  const temperatureScore = temperature >= 20 && temperature <= 28 ? 85 : 64;
  const confidence = clamp(
    Math.round(nutrientBalance * 0.36 + phScore * 0.24 + rainfallScore * 0.2 + temperatureScore * 0.2),
    54,
    96,
  );
  const recommendation =
    nutrientBalance < 35
      ? "Delay planting and correct nutrient deficiencies before the next rainfall window."
      : rainfall < 12
        ? "Use moisture conservation and stage irrigation support before pushing high-yield recommendations."
        : temperature > 30
          ? "Prioritize heat-risk management and avoid nitrogen-heavy applications this week."
          : "Conditions support the advisory rule. Proceed with crop-stage recommendation and monitor weather shifts.";

  return {
    recommendation,
    confidence,
    explanation: `Generated from ${input.crop}, ${input.growthStage} stage, pH ${ph}, NPK ${nitrogen}/${phosphorus}/${potassium}, rainfall ${rainfall} mm, and temperature ${temperature}C.`,
  };
}

async function ensureContentSeedData() {
  const count = await prisma.contentEntry.count();
  if (count > 0) return;
  await prisma.contentEntry.createMany({ data: DEFAULT_CONTENT_ENTRIES });
}

async function buildContentDashboard() {
  await ensureContentSeedData();

  const [entries, sandboxRuns, auditLogs] = await Promise.all([
    prisma.contentEntry.findMany({ orderBy: [{ moduleType: "asc" }, { updatedAt: "desc" }] }),
    prisma.contentSandboxRun.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "ContentEntry" },
          { entityType: "ContentSandboxRun" },
          { entityType: "ContentManagement" },
        ],
      },
      include: { actor: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const groupedEntries = groupEntries(entries);
  const allMappedEntries = Object.values(groupedEntries).flat();

  const contentStats = [
    { label: "Total Crops", value: groupedEntries.Crops?.length || 0 },
    { label: "Total Pests", value: groupedEntries.Pests?.length || 0 },
    { label: "Advisory Rules", value: groupedEntries["Advisory Logic"]?.length || 0 },
    { label: "Fertilizer Standards", value: groupedEntries["Fertilizer Standards"]?.length || 0 },
    { label: "Published Content", value: allMappedEntries.filter((item) => item.status === "Published").length },
    { label: "Pending Reviews", value: allMappedEntries.filter((item) => item.status === "Pending Review").length },
  ];

  const languageSummary = CONTENT_LANGUAGE_OPTIONS.map((language) => ({
    language,
    total: entries.filter((item) => item.language === language).length,
  }));

  const auditTrail = auditLogs.map((item) => ({
    id: item.id,
    user: item.actor?.fullName || "System Sync",
    action: toAuditActionLabel(item.action),
    module:
      item.entityType === "ContentManagement"
        ? "Content Management"
        : item.details && String(item.details).includes("Fertilizer Standards")
          ? "Fertilizer Standards"
          : item.entityType === "ContentSandboxRun"
            ? "Advisory Logic"
            : "Content Entry",
    timestamp: item.createdAt,
  }));

  const modifications = auditTrail.slice(0, 6).map((item) => ({
    title: item.action,
    meta: `${item.user} · ${formatReadableDate(item.timestamp)}`,
  }));

  const latestSandbox = sandboxRuns[0]
    ? {
        input: sandboxRuns[0].inputPayload || null,
        output: sandboxRuns[0].outputPayload || null,
        savedAsRule: Boolean(sandboxRuns[0].savedAsRule),
        createdAt: sandboxRuns[0].createdAt,
      }
    : null;

  return {
    mode: "backend",
    entries: groupedEntries,
    contentStats,
    languageSummary,
    modifications,
    auditTrail,
    latestSandbox,
    fertilizerCards: [
      { title: "Nitrogen Optimization", state: "Active" },
      { title: "Phosphorus Protocol", state: "Pending" },
    ],
  };
}

async function getContentManagementDashboard() {
  return buildContentDashboard();
}

async function createContentEntry({ actorUser, payload }) {
  const moduleType = payload?.moduleType;
  const title = String(payload?.title || "").trim();
  const language = payload?.language || "English";

  if (!MODULE_TYPES.includes(moduleType)) {
    throw new ApiError(400, "Invalid content module type.");
  }

  if (!title) {
    throw new ApiError(400, "Content title is required.");
  }

  const data = buildDefaultEntry(moduleType, title, language);
  const entry = await prisma.contentEntry.create({
    data: {
      moduleType: data.moduleType,
      title: data.title,
      status: data.status,
      language: data.language,
      cycle: data.cycle,
      zone: data.zone,
      category: data.category || null,
      summary: data.summary || null,
      metadata: data.metadata || null,
      createdByUserId: actorUser?.id || null,
      updatedByUserId: actorUser?.id || null,
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CONTENT_ENTRY_CREATED",
      entityType: "ContentEntry",
      entityId: entry.id,
      details: { moduleType, title },
    });
  }

  return {
    entry: mapContentEntry(entry),
    dashboard: await buildContentDashboard(),
  };
}

async function advanceContentEntryStatus({ actorUser, entryId }) {
  const entry = await prisma.contentEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    throw new ApiError(404, "Content entry not found.");
  }

  const currentIndex = CONTENT_WORKFLOW.indexOf(entry.status);
  const nextStatus = CONTENT_WORKFLOW[(currentIndex + 1) % CONTENT_WORKFLOW.length] || "Draft";

  const updated = await prisma.contentEntry.update({
    where: { id: entryId },
    data: {
      status: nextStatus,
      updatedByUserId: actorUser?.id || null,
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CONTENT_ENTRY_STATUS_UPDATED",
      entityType: "ContentEntry",
      entityId: updated.id,
      details: { moduleType: updated.moduleType, title: updated.title, status: nextStatus },
    });
  }

  return {
    entry: mapContentEntry(updated),
    dashboard: await buildContentDashboard(),
  };
}

async function archiveContentEntry({ actorUser, entryId }) {
  const entry = await prisma.contentEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    throw new ApiError(404, "Content entry not found.");
  }

  await prisma.contentEntry.delete({ where: { id: entryId } });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CONTENT_ENTRY_ARCHIVED",
      entityType: "ContentEntry",
      entityId: entryId,
      details: { moduleType: entry.moduleType, title: entry.title },
    });
  }

  return {
    deleted: true,
    dashboard: await buildContentDashboard(),
  };
}

async function syncFertilizerStandards({ actorUser }) {
  await ensureContentSeedData();

  await prisma.contentEntry.updateMany({
    where: { moduleType: "Fertilizer Standards" },
    data: {
      status: "Published",
      updatedByUserId: actorUser?.id || null,
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CONTENT_FERTILIZER_SYNC",
      entityType: "ContentManagement",
      entityId: "fertilizer-standards-sync",
      details: { moduleType: "Fertilizer Standards" },
    });
  }

  return {
    synced: true,
    dashboard: await buildContentDashboard(),
  };
}

async function testContentSandbox({ actorUser, payload }) {
  const output = computeSandboxOutput(payload || {});
  const run = await prisma.contentSandboxRun.create({
    data: {
      actorUserId: actorUser?.id || null,
      inputPayload: payload || {},
      outputPayload: output,
      savedAsRule: false,
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CONTENT_SANDBOX_TESTED",
      entityType: "ContentSandboxRun",
      entityId: run.id,
      details: { crop: payload?.crop, growthStage: payload?.growthStage },
    });
  }

  return {
    run: {
      id: run.id,
      input: run.inputPayload,
      output: run.outputPayload,
      savedAsRule: false,
      createdAt: run.createdAt,
    },
    dashboard: await buildContentDashboard(),
  };
}

async function saveContentSandbox({ actorUser, payload }) {
  const output = computeSandboxOutput(payload || {});
  const run = await prisma.contentSandboxRun.create({
    data: {
      actorUserId: actorUser?.id || null,
      inputPayload: payload || {},
      outputPayload: output,
      savedAsRule: true,
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CONTENT_SANDBOX_SAVED",
      entityType: "ContentSandboxRun",
      entityId: run.id,
      details: { crop: payload?.crop, growthStage: payload?.growthStage },
    });
  }

  return {
    run: {
      id: run.id,
      input: run.inputPayload,
      output: run.outputPayload,
      savedAsRule: true,
      createdAt: run.createdAt,
    },
    dashboard: await buildContentDashboard(),
  };
}

module.exports = {
  getContentManagementDashboard,
  createContentEntry,
  advanceContentEntryStatus,
  archiveContentEntry,
  syncFertilizerStandards,
  testContentSandbox,
  saveContentSandbox,
};

