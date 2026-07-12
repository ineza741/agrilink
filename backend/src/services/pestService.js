const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

async function _allLibraryRecords(where = {}) {
  return prisma.diseaseLibrary.findMany({ where: { active: true, ...where }, orderBy: { name: "asc" } });
}

function _mapLibraryRecord(r) {
  return {
    id: r.id,
    name: r.name,
    scientificName: r.scientificName,
    type: r.type,
    affectedCrops: r.affectedCrops.split(",").map((s) => s.trim()).filter(Boolean),
    commonSymptoms: r.symptoms.split(",").map((s) => s.trim()).filter(Boolean),
    preventionAdvice: r.prevention,
    treatment: { chemical: r.treatment, organic: "" },
    severity: r.severity,
    imageUrl: r.imageUrl || "",
    source: r.source || "",
    modelClassLabel: r.modelClassLabel || null,
    recognitionSupported: r.recognitionSupported || false,
    imageAuthor: r.imageAuthor || null,
    imageLicence: r.imageLicence || null,
  };
}

async function listDiseaseLibrary({ crop, search, type, page, pageSize } = {}) {
  const where = { active: true };
  if (crop) {
    where.affectedCrops = { contains: crop };
  }
  if (type && type !== "All") {
    where.type = type;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { scientificName: { contains: search } },
      { affectedCrops: { contains: search } },
    ];
  }

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const ps = Math.min(Math.max(parseInt(pageSize, 10) || 9, 1), 100);

  const [records, total] = await Promise.all([
    prisma.diseaseLibrary.findMany({ where, orderBy: { name: "asc" }, skip: (p - 1) * ps, take: ps }),
    prisma.diseaseLibrary.count({ where }),
  ]);

  return {
    data: records.map(_mapLibraryRecord),
    pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) },
  };
}

async function listSymptoms() {
  const records = await prisma.diseaseLibrary.findMany({
    where: { active: true },
    select: { symptoms: true },
  });
  const symptomSet = new Set();
  for (const r of records) {
    for (const s of r.symptoms.split(",").map((s) => s.trim()).filter(Boolean)) {
      symptomSet.add(s);
    }
  }
  return [...symptomSet].sort();
}

async function listSymptomsByCrop(crop) {
  if (!crop) return [];
  const records = await prisma.diseaseLibrary.findMany({
    where: { active: true, affectedCrops: { contains: crop } },
    select: { symptoms: true },
  });
  const symptomMap = new Map();
  for (const r of records) {
    for (const s of r.symptoms.split(",").map((s) => s.trim()).filter(Boolean)) {
      symptomMap.set(s, (symptomMap.get(s) || 0) + 1);
    }
  }
  return [...symptomMap.entries()]
    .map(([name, conditionCount]) => ({ name, conditionCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function analyzePestRisk(user, farmId, payload) {
  const farm = await ensureFarmAccess(user, farmId);

  const selectedSymptoms = Array.isArray(payload.symptoms) ? payload.symptoms : (payload.symptom ? [payload.symptom] : []);
  const symptomStr = selectedSymptoms.join(",");
  const affectedArea = Math.round(Number(payload.affectedArea || 0));

  const rawRecords = await _allLibraryRecords();
  const library = rawRecords.map(_mapLibraryRecord);
  const crop = payload.crop || "";

  const cropMatch = library.filter((d) => d.affectedCrops.includes(crop) || d.affectedCrops.includes("Vegetables"));
  const matched = cropMatch.map((d) => {
    let score = 0;
    if (d.affectedCrops.includes(crop)) score += 40;
    const symptomScore = selectedSymptoms.reduce((sum, s) => sum + (d.commonSymptoms.includes(s) ? 20 : 0), 0);
    score += symptomScore;
    score += Math.min(affectedArea * 0.3, 20);
    const confidence = Math.min(Math.round(score + Math.random() * 8), 97);
    return { ...d, score, confidence };
  }).sort((a, b) => b.score - a.score);

  const top = matched[0] || null;
  const confidence = top ? Math.min(top.confidence, 97) : 0;
  const diseaseName = top?.name || "Unidentified";
  const scientificName = top?.scientificName || "";
  const severity = top?.severity || "Medium";
  const priority = confidence >= 80 ? "High" : confidence >= 55 ? "Medium" : "Low";

  const matchedRecord = top ? rawRecords.find((r) => r.name === top.name) : null;
  const conditionId = matchedRecord?.id || null;

  const farmRecord = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { district: true, sector: true, province: true },
  });
  const district = farmRecord?.district || "Unknown District";

  const storedHistory = await prisma.pestDiagnosis.findMany({
    where: { OR: [{ farmId }, { district }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const diagnosisData = {
    farmId,
    cropName: crop,
    symptom: selectedSymptoms[0] || "",
    symptoms: symptomStr,
    affectedArea,
    uploadedImageName: payload.uploadedImageName || null,
    diseaseName,
    scientificName,
    conditionId,
    confidence: Math.max(confidence, 45),
    currentRisk: severity,
    forecastRisk: severity,
    farmRiskScore: Math.min(Math.round(confidence * 0.8 + affectedArea * 0.5), 99),
    regionalRiskScore: Math.min(Math.round(confidence * 0.6 + storedHistory.length * 5), 99),
    yieldLoss: Math.min(Math.round(affectedArea * 0.3 + (confidence > 70 ? 10 : 0)), 40),
    economicLoss: 0,
    priority,
    status: "Pending",
    district,
    cropStage: payload.cropStage || "Vegetative",
    weatherContribution: payload.weatherContribution || {},
    topDiagnosis: top
      ? { name: top.name, scientificName: top.scientificName, severity: top.severity, confidence, imageUrl: matchedRecord?.imageUrl || null }
      : null,
    rankedDiagnoses: matched.slice(0, 5).map((d) => ({
      name: d.name,
      scientificName: d.scientificName,
      score: d.score,
      confidence: d.confidence,
    })),
    explanation: top
      ? {
          summary: `Current weather conditions and reported symptoms (${selectedSymptoms.join(", ")}) are consistent with ${top.name.toLowerCase()} on ${crop}.`,
          weather: `${payload.weatherContribution?.current?.humidity || "--"}% humidity and ${payload.weatherContribution?.current?.temperature || "--"}C conditions contribute to disease risk.`,
        }
      : { summary: "Not enough information to produce a diagnosis." },
    recommendation: top
      ? { title: `Control ${top.name} on ${farmRecord?.id || farmId}`, actionType: "Pest/Disease" }
      : null,
  };

  const created = await prisma.pestDiagnosis.create({ data: diagnosisData });

  await createAuditLog({
    actorUserId: user.id,
    action: "PEST_DIAGNOSIS_GENERATED",
    entityType: "PestDiagnosis",
    entityId: created.id,
    details: { farmId, crop, disease: diseaseName },
  });

  return mapDiagnosisRecord(created);
}

async function getLatestDiagnosis(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const record = await prisma.pestDiagnosis.findFirst({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    include: { condition: { select: { imageUrl: true, name: true } } },
  });
  return record ? mapDiagnosisRecord(record) : null;
}

async function getFarmDiagnosisHistory(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const records = await prisma.pestDiagnosis.findMany({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return records.map(buildHistoryRowFromDiagnosis);
}

async function getOutbreakData({ district } = {}) {
  const where = {};
  if (district) {
    where.district = { contains: district.replace(" District", "") };
  }
  const records = await prisma.outbreakRecord.findMany({
    where,
    orderBy: { detectedAt: "desc" },
    take: 50,
  });
  return records;
}

async function getRegionalOutbreakSummary({ district } = {}) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const whereBase = { confirmationStatus: "Confirmed" };
  if (district) {
    whereBase.district = { contains: district.replace(" District", "") };
  }

  const recentRecords = await prisma.outbreakRecord.findMany({
    where: { ...whereBase, detectedAt: { gte: thirtyDaysAgo } },
  });

  const previousRecords = await prisma.outbreakRecord.findMany({
    where: {
      ...whereBase,
      detectedAt: { gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000), lt: thirtyDaysAgo },
    },
  });

  const cases = recentRecords.length;
  const prevCases = previousRecords.length;
  const trend = cases > prevCases ? "Increasing" : cases < prevCases ? "Decreasing" : "Stable";
  const severityLevels = recentRecords.map((r) => r.severity);
  const highCount = severityLevels.filter((s) => s === "High" || s === "Critical").length;
  const intensity = cases === 0 ? 0 : Math.min(Math.round((highCount * 40 + cases * 15) / 10), 100);
  const risk = cases === 0 ? "None" : intensity >= 60 ? "High Risk" : intensity >= 30 ? "Moderate Risk" : "Low Risk";

  return {
    district: district || "All districts",
    risk,
    intensity: Math.min(Math.round(intensity / 10), 10),
    trend,
    nearbyCases: cases,
    records: recentRecords,
  };
}

async function updateDiagnosisStatus(user, diagnosisId, status) {
  const diagnosis = await prisma.pestDiagnosis.findUnique({
    where: { id: diagnosisId },
    include: { farm: { include: { farmerProfile: { include: { user: true } } } } },
  });
  if (!diagnosis) throw new ApiError(404, "Pest diagnosis not found.");

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = diagnosis.farm?.farmerProfile?.userId === user.id;
  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to update this diagnosis.");
  }

  const updateData = { status };
  if (status === "Accepted") updateData.acceptedAt = new Date();
  if (status === "Completed") updateData.completedAt = new Date();
  if (status === "Rejected") { updateData.rejectedAt = new Date(); updateData.rejectionReason = ""; }

  await prisma.pestDiagnosis.update({ where: { id: diagnosisId }, data: updateData });

  await prisma.pestActionLog.create({
    data: {
      diagnosisId,
      farmId: diagnosis.farmId,
      recommendationId: diagnosis.id,
      actionType: "Pest/Disease",
      feedbackStatus: status.toLowerCase(),
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "PEST_DIAGNOSIS_" + status.toUpperCase(),
    entityType: "PestDiagnosis",
    entityId: diagnosisId,
    details: { status },
  });

  return mapDiagnosisRecord({ ...diagnosis, ...updateData });
}

async function addDiagnosisAction(user, diagnosisId, payload) {
  const diagnosis = await prisma.pestDiagnosis.findUnique({
    where: { id: diagnosisId },
    include: { farm: { include: { farmerProfile: { include: { user: true } } } } },
  });
  if (!diagnosis) throw new ApiError(404, "Pest diagnosis not found.");

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = diagnosis.farm?.farmerProfile?.userId === user.id;
  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to update this pest diagnosis.");
  }

  const created = await prisma.pestActionLog.create({
    data: {
      diagnosisId,
      farmId: diagnosis.farmId,
      recommendationId: payload.recommendationId || diagnosis.id,
      actionType: payload.actionType || "Pest/Disease",
      feedbackStatus: payload.feedbackStatus,
      rejectionReason: payload.feedbackStatus === "rejected" ? payload.rejectionReason || "" : null,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "PEST_ACTION_RECORDED",
    entityType: "PestActionLog",
    entityId: created.id,
    details: { diagnosisId, feedbackStatus: payload.feedbackStatus },
  });

  return mapActionLogRecord(created);
}

async function getDiagnosisActions(user, diagnosisId) {
  const diagnosis = await prisma.pestDiagnosis.findUnique({
    where: { id: diagnosisId },
    include: { farm: { include: { farmerProfile: { include: { user: true } } } } },
  });
  if (!diagnosis) throw new ApiError(404, "Pest diagnosis not found.");

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = diagnosis.farm?.farmerProfile?.userId === user.id;
  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to access this pest diagnosis.");
  }

  const logs = await prisma.pestActionLog.findMany({
    where: { diagnosisId },
    orderBy: { createdAt: "desc" },
  });
  return logs.map(mapActionLogRecord);
}

function mapDiagnosisRecord(record) {
  if (!record) return null;
  const conditionImageUrl = record.condition?.imageUrl || record.topDiagnosis?.imageUrl || null;
  const topDiag = record.topDiagnosis
    ? { ...(typeof record.topDiagnosis === "object" ? record.topDiagnosis : {}), imageUrl: conditionImageUrl || null }
    : null;
  return {
    id: record.id,
    farmId: record.farmId,
    crop: record.cropName,
    symptom: record.symptom,
    symptoms: record.symptoms ? record.symptoms.split(",").filter(Boolean) : [],
    affectedArea: record.affectedArea,
    uploadedImageName: record.uploadedImageName || "",
    uploadedImagePath: record.uploadedImagePath || null,
    conditionId: record.conditionId || null,
    conditionImageUrl,
    diagnosisSource: record.diagnosisSource || null,
    modelVersion: record.modelVersion || null,
    imageQuality: record.imageQuality || null,
    topDiagnosis: topDiag,
    ranked: Array.isArray(record.rankedDiagnoses) ? record.rankedDiagnoses : [],
    confidence: record.confidence,
    cropStage: record.cropStage,
    currentRisk: record.currentRisk,
    forecastRisk: record.forecastRisk,
    farmRiskScore: record.farmRiskScore,
    regionalRiskScore: record.regionalRiskScore,
    yieldLoss: record.yieldLoss,
    economicLoss: Number(record.economicLoss || 0),
    priority: record.priority,
    status: record.status || "Pending",
    district: record.district,
    explanation: record.explanation || {},
    recommendation: record.recommendation || {},
    weatherContribution: record.weatherContribution || {},
    diseaseName: record.diseaseName,
    scientificName: record.scientificName,
    acceptedAt: record.acceptedAt,
    completedAt: record.completedAt,
    rejectedAt: record.rejectedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapActionLogRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    diagnosisId: record.diagnosisId,
    farmId: record.farmId,
    recommendationId: record.recommendationId,
    actionType: record.actionType,
    feedbackStatus: record.feedbackStatus,
    rejectionReason: record.rejectionReason || "",
    timestamp: record.createdAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildHistoryRowFromDiagnosis(diagnosis) {
  return {
    id: diagnosis.id,
    date: diagnosis.createdAt || new Date().toISOString(),
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(diagnosis.createdAt)),
    pathogen: diagnosis.scientificName || diagnosis.diseaseName,
    severity: diagnosis.currentRisk,
    action: diagnosis.priority === "Critical" || diagnosis.priority === "High" ? "Field intervention" : "Guided scouting",
    district: diagnosis.district,
    outcome: diagnosis.status || "Active",
  };
}

module.exports = {
  listDiseaseLibrary,
  listSymptoms,
  listSymptomsByCrop,
  analyzePestRisk,
  getLatestDiagnosis,
  getFarmDiagnosisHistory,
  getOutbreakData,
  getRegionalOutbreakSummary,
  updateDiagnosisStatus,
  addDiagnosisAction,
  getDiagnosisActions,
};
