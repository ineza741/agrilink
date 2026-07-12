const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const CROP_LIST = [
  "Wheat", "Corn", "Soybeans", "Rice", "Barley", "Beans",
  "Irish Potato", "Sweet Potato", "Cassava", "Sorghum",
  "Banana", "Plantain", "Groundnuts", "Peas", "Coffee", "Tea",
];

function serializeCropPrice(record) {
  if (!record) return null;
  return {
    id: record.id,
    cropName: record.cropName,
    cropVariety: record.cropVariety || "",
    marketName: record.marketName,
    district: record.district,
    sector: record.sector || "",
    unit: record.unit,
    currency: record.currency,
    wholesalePrice: Number(record.wholesalePrice),
    retailPrice: Number(record.retailPrice),
    farmGatePrice: record.farmGatePrice != null ? Number(record.farmGatePrice) : null,
    previousPrice: record.previousPrice != null ? Number(record.previousPrice) : null,
    effectiveDate: record.effectiveDate,
    status: record.status,
    source: record.source,
    notes: record.notes || "",
    createdByUserId: record.createdByUserId,
    updatedByUserId: record.updatedByUserId || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy
      ? { id: record.createdBy.id, fullName: record.createdBy.fullName }
      : null,
    updatedBy: record.updatedBy
      ? { id: record.updatedBy.id, fullName: record.updatedBy.fullName }
      : null,
  };
}

function serializeHistory(record) {
  if (!record) return null;
  return {
    id: record.id,
    cropPriceId: record.cropPriceId,
    cropName: record.cropName,
    marketName: record.marketName,
    district: record.district,
    oldWholesale: Number(record.oldWholesale),
    newWholesale: Number(record.newWholesale),
    oldRetail: Number(record.oldRetail),
    newRetail: Number(record.newRetail),
    oldFarmGate: record.oldFarmGate != null ? Number(record.oldFarmGate) : null,
    newFarmGate: record.newFarmGate != null ? Number(record.newFarmGate) : null,
    effectiveDate: record.effectiveDate,
    changedByUserId: record.changedByUserId,
    reason: record.reason,
    status: record.status,
    createdAt: record.createdAt,
    changedBy: record.changedBy
      ? { id: record.changedBy.id, fullName: record.changedBy.fullName }
      : null,
  };
}

async function listCropPrices({ cropName, district, marketName, status, search } = {}) {
  const where = {};

  if (cropName) where.cropName = cropName;
  if (district) where.district = district;
  if (marketName) where.marketName = marketName;
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { cropName: { contains: search } },
      { marketName: { contains: search } },
      { district: { contains: search } },
    ];
  }

  const prices = await prisma.cropPrice.findMany({
    where,
    include: {
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ cropName: "asc" }, { effectiveDate: "desc" }],
  });

  return prices.map(serializeCropPrice);
}

async function getCurrentPrices() {
  const prices = await prisma.cropPrice.findMany({
    where: { status: "Active" },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ cropName: "asc" }, { effectiveDate: "desc" }],
  });

  const latestByCrop = new Map();
  for (const price of prices) {
    const key = `${price.cropName}|${price.marketName}`;
    if (!latestByCrop.has(key)) {
      latestByCrop.set(key, price);
    }
  }

  return [...latestByCrop.values()].map(serializeCropPrice);
}

async function getCurrentPriceByCrop(cropName) {
  const price = await prisma.cropPrice.findFirst({
    where: { cropName, status: "Active" },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (!price) {
    return null;
  }

  const history = await prisma.cropPriceHistory.findMany({
    where: { cropName },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      changedBy: { select: { id: true, fullName: true } },
    },
  });

  return {
    ...serializeCropPrice(price),
    history: history.map(serializeHistory),
  };
}

function normalizeOfficialPriceType(priceType = "Wholesale") {
  if (priceType === "Retail") return "Retail";
  if (priceType === "Farm Gate" || priceType === "FarmGate") return "Farm Gate";
  return "Wholesale";
}

async function getCurrentOfficialPrice({ cropName, marketName, district, priceType = "Wholesale" } = {}) {
  if (!cropName) {
    throw new ApiError(400, "crop is required.");
  }

  const normalizedPriceType = normalizeOfficialPriceType(priceType);
  const fieldMap = {
    Wholesale: { field: "wholesalePrice", historyField: "oldWholesale" },
    Retail: { field: "retailPrice", historyField: "oldRetail" },
    "Farm Gate": { field: "farmGatePrice", historyField: "oldFarmGate" },
  };
  const config = fieldMap[normalizedPriceType];

  const record = await prisma.cropPrice.findFirst({
    where: {
      cropName,
      status: "Active",
      ...(marketName ? { marketName } : {}),
      ...(district ? { district } : {}),
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ effectiveDate: "desc" }, { updatedAt: "desc" }],
  });

  if (!record || record[config.field] == null) {
    throw new ApiError(404, "No official price found for the requested crop, market, and price type.");
  }

  const latestHistory = await prisma.cropPriceHistory.findFirst({
    where: { cropPriceId: record.id },
    orderBy: [{ createdAt: "desc" }],
  });

  const currentPrice = Number(record[config.field]);
  const rawPreviousPrice = latestHistory?.[config.historyField] != null
    ? Number(latestHistory[config.historyField])
    : normalizedPriceType === "Wholesale" && record.previousPrice != null
      ? Number(record.previousPrice)
      : null;
  const isInitialCreation = rawPreviousPrice === 0 && latestHistory != null;
  const previousPrice = isInitialCreation ? currentPrice : rawPreviousPrice;
  const percentageChange = previousPrice != null && currentPrice != null
    ? Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(1))
    : null;

  return {
    crop: record.cropName,
    market: record.marketName,
    district: record.district,
    priceType: normalizedPriceType,
    currentPrice,
    previousPrice,
    percentageChange,
    currency: record.currency,
    unit: record.unit,
    effectiveDate: record.effectiveDate,
    updatedBy: record.updatedBy?.fullName || record.createdBy?.fullName || "Unknown",
  };
}

async function createCropPrice({ payload, user }) {
  const existing = await prisma.cropPrice.findFirst({
    where: {
      cropName: payload.cropName,
      marketName: payload.marketName,
      status: "Active",
    },
  });

  if (existing) {
    throw new ApiError(409, `An active price for ${payload.cropName} at ${payload.marketName} already exists. Please edit the existing price instead.`);
  }

  const price = await prisma.cropPrice.create({
    data: {
      cropName: payload.cropName,
      cropVariety: payload.cropVariety || null,
      marketName: payload.marketName,
      district: payload.district,
      sector: payload.sector || null,
      unit: payload.unit || "kg",
      currency: payload.currency || "RWF",
      wholesalePrice: payload.wholesalePrice,
      retailPrice: payload.retailPrice,
      farmGatePrice: payload.farmGatePrice || null,
      effectiveDate: new Date(payload.effectiveDate),
      status: "Active",
      source: "Market Officer",
      notes: payload.notes || null,
      createdByUserId: user.id,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  await prisma.cropPriceHistory.create({
    data: {
      cropPriceId: price.id,
      cropName: price.cropName,
      marketName: price.marketName,
      district: price.district,
      oldWholesale: 0,
      newWholesale: price.wholesalePrice,
      oldRetail: 0,
      newRetail: price.retailPrice,
      oldFarmGate: 0,
      newFarmGate: price.farmGatePrice,
      effectiveDate: price.effectiveDate,
      changedByUserId: user.id,
      reason: payload.reason || "Initial price creation",
      status: "Published",
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "CREATE_CROP_PRICE",
    entityType: "CropPrice",
    entityId: price.id,
    details: { cropName: price.cropName, marketName: price.marketName, wholesalePrice: price.wholesalePrice },
  });

  return serializeCropPrice(price);
}

async function updateCropPrice({ priceId, payload, user }) {
  const existing = await prisma.cropPrice.findUnique({
    where: { id: priceId },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  if (!existing) {
    throw new ApiError(404, "Crop price not found.");
  }

  if (existing.status !== "Active") {
    throw new ApiError(400, "Cannot update an inactive price. Create a new price entry instead.");
  }

  const oldWholesale = Number(existing.wholesalePrice);
  const oldRetail = Number(existing.retailPrice);
  const oldFarmGate = existing.farmGatePrice != null ? Number(existing.farmGatePrice) : null;

  const updated = await prisma.cropPrice.update({
    where: { id: priceId },
    data: {
      ...(payload.cropName ? { cropName: payload.cropName } : {}),
      ...(payload.cropVariety !== undefined ? { cropVariety: payload.cropVariety } : {}),
      ...(payload.marketName ? { marketName: payload.marketName } : {}),
      ...(payload.district ? { district: payload.district } : {}),
      ...(payload.sector !== undefined ? { sector: payload.sector } : {}),
      ...(payload.unit ? { unit: payload.unit } : {}),
      ...(payload.currency ? { currency: payload.currency } : {}),
      ...(payload.wholesalePrice != null ? { wholesalePrice: payload.wholesalePrice } : {}),
      ...(payload.retailPrice != null ? { retailPrice: payload.retailPrice } : {}),
      ...(payload.farmGatePrice !== undefined ? { farmGatePrice: payload.farmGatePrice } : {}),
      ...(payload.effectiveDate ? { effectiveDate: new Date(payload.effectiveDate) } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      previousPrice: oldWholesale,
      updatedByUserId: user.id,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
    },
  });

  await prisma.cropPriceHistory.create({
    data: {
      cropPriceId: updated.id,
      cropName: updated.cropName,
      marketName: updated.marketName,
      district: updated.district,
      oldWholesale,
      newWholesale: Number(updated.wholesalePrice),
      oldRetail,
      newRetail: Number(updated.retailPrice),
      oldFarmGate,
      newFarmGate: updated.farmGatePrice != null ? Number(updated.farmGatePrice) : null,
      effectiveDate: updated.effectiveDate,
      changedByUserId: user.id,
      reason: payload.reason,
      status: "Published",
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_CROP_PRICE",
    entityType: "CropPrice",
    entityId: priceId,
    details: {
      cropName: updated.cropName,
      marketName: updated.marketName,
      oldWholesale,
      newWholesale: Number(updated.wholesalePrice),
      reason: payload.reason,
    },
  });

  return serializeCropPrice(updated);
}

async function deactivateCropPrice({ priceId, user }) {
  const existing = await prisma.cropPrice.findUnique({
    where: { id: priceId },
  });

  if (!existing) {
    throw new ApiError(404, "Crop price not found.");
  }

  if (existing.status !== "Active") {
    throw new ApiError(400, "Price is already inactive.");
  }

  const updated = await prisma.cropPrice.update({
    where: { id: priceId },
    data: {
      status: "Inactive",
      updatedByUserId: user.id,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "DEACTIVATE_CROP_PRICE",
    entityType: "CropPrice",
    entityId: priceId,
    details: { cropName: existing.cropName, marketName: existing.marketName },
  });

  return serializeCropPrice(updated);
}

async function getPriceHistory({ cropName, marketName, district } = {}) {
  const where = {};
  if (cropName) where.cropName = cropName;
  if (marketName) where.marketName = marketName;
  if (district) where.district = district;

  const history = await prisma.cropPriceHistory.findMany({
    where,
    include: {
      changedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return history.map(serializeHistory);
}

async function getOfficialPrices() {
  const prices = await prisma.cropPrice.findMany({
    where: { status: "Active" },
    orderBy: [{ cropName: "asc" }, { effectiveDate: "desc" }],
  });

  const officialByCrop = new Map();
  for (const price of prices) {
    const key = price.cropName;
    if (!officialByCrop.has(key)) {
      officialByCrop.set(key, price);
    }
  }

  const result = {};
  for (const [cropName, price] of officialByCrop) {
    result[cropName] = {
      wholesalePrice: Number(price.wholesalePrice),
      retailPrice: Number(price.retailPrice),
      farmGatePrice: price.farmGatePrice != null ? Number(price.farmGatePrice) : null,
      marketName: price.marketName,
      district: price.district,
      effectiveDate: price.effectiveDate,
      unit: price.unit,
      currency: price.currency,
    };
  }

  return result;
}

function summarizeHistoryChange(entry) {
  const candidates = [
    { priceType: "Wholesale", oldValue: Number(entry.oldWholesale || 0), newValue: Number(entry.newWholesale || 0) },
    { priceType: "Retail", oldValue: Number(entry.oldRetail || 0), newValue: Number(entry.newRetail || 0) },
    {
      priceType: "Farm Gate",
      oldValue: entry.oldFarmGate != null ? Number(entry.oldFarmGate) : null,
      newValue: entry.newFarmGate != null ? Number(entry.newFarmGate) : null,
    },
  ].filter((item) => item.newValue != null);

  const changed = candidates.find((item) => item.oldValue !== item.newValue) || candidates[0] || null;
  if (!changed) return null;

  const changeValue = changed.newValue - (changed.oldValue || 0);
  const changePercent = changed.oldValue > 0 ? (changeValue / changed.oldValue) * 100 : null;

  return {
    priceType: changed.priceType,
    oldValue: changed.oldValue,
    newValue: changed.newValue,
    changeValue,
    changePercent,
    direction: changeValue >= 0 ? "increase" : "decrease",
  };
}

function buildManagedWhere(user) {
  const filters = [{ createdByUserId: user.id }, { updatedByUserId: user.id }];
  if (user.marketOfficerProfile?.marketName) filters.push({ marketName: user.marketOfficerProfile.marketName });
  if (user.marketOfficerProfile?.district) filters.push({ district: user.marketOfficerProfile.district });
  return { OR: filters };
}

async function getMarketOfficerDashboard(user) {
  const managedWhere = buildManagedWhere(user);
  const managedActiveWhere = { AND: [{ status: "Active" }, managedWhere] };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeManagedPrices, recentHistory] = await Promise.all([
    prisma.cropPrice.findMany({
      where: managedActiveWhere,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        updatedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { effectiveDate: "desc" }],
    }),
    prisma.cropPriceHistory.findMany({
      where: {
        OR: [
          { changedByUserId: user.id },
          ...(user.marketOfficerProfile?.marketName ? [{ marketName: user.marketOfficerProfile.marketName }] : []),
          ...(user.marketOfficerProfile?.district ? [{ district: user.marketOfficerProfile.district }] : []),
        ],
      },
      include: {
        changedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const recentUpdates = recentHistory.slice(0, 5).map((entry) => ({
    ...serializeHistory(entry),
    summary: summarizeHistoryChange(entry),
  }));

  const pricesUpdatedToday = recentHistory.filter((entry) => new Date(entry.createdAt) >= todayStart).length;
  const latestHistory = recentHistory[0] || null;
  const latestSummary = latestHistory ? summarizeHistoryChange(latestHistory) : null;

  const missingCrops = CROP_LIST.filter(
    (cropName) => !activeManagedPrices.some((price) => price.cropName === cropName),
  ).slice(0, 3);

  const stalePrices = activeManagedPrices
    .filter((price) => {
      const basisDate = price.updatedAt || price.effectiveDate;
      return basisDate && (Date.now() - new Date(basisDate).getTime()) / (1000 * 60 * 60 * 24) > 14;
    })
    .slice(0, 3)
    .map((price) => ({
      cropName: price.cropName,
      marketName: price.marketName,
      issue: "Price not updated recently",
      detail: `Last changed on ${new Date(price.updatedAt || price.effectiveDate).toISOString().split("T")[0]}.`,
      effectiveDate: price.effectiveDate,
      status: price.status,
    }));

  const significantChanges = recentHistory
    .map((entry) => ({ entry, summary: summarizeHistoryChange(entry) }))
    .filter((item) => item.summary && item.summary.changePercent != null && Math.abs(item.summary.changePercent) >= 15)
    .slice(0, 3)
    .map(({ entry, summary }) => ({
      cropName: entry.cropName,
      marketName: entry.marketName,
      issue: "Significant recent change",
      detail: `${summary.priceType} moved by ${summary.changePercent.toFixed(1)}%.`,
      effectiveDate: entry.effectiveDate,
      status: entry.status,
    }));

  const incompleteRecords = activeManagedPrices
    .filter((price) => !price.marketName || !price.district || !price.unit)
    .slice(0, 2)
    .map((price) => ({
      cropName: price.cropName,
      marketName: price.marketName,
      issue: "Incomplete price record",
      detail: "One or more required market fields are missing.",
      effectiveDate: price.effectiveDate,
      status: price.status,
    }));

  const missingActivePrices = missingCrops.map((cropName) => ({
    cropName,
    marketName: user.marketOfficerProfile?.marketName || user.marketOfficerProfile?.district || "Assigned market",
    issue: "No active price exists",
    detail: "No active official price has been published yet.",
    effectiveDate: null,
    status: "Missing",
  }));

  const cropsRequiringAttention = [...stalePrices, ...significantChanges, ...incompleteRecords, ...missingActivePrices].slice(0, 6);

  return {
    officer: {
      id: user.id,
      fullName: user.fullName,
      marketName: user.marketOfficerProfile?.marketName || "",
      district: user.marketOfficerProfile?.district || "",
      sector: user.marketOfficerProfile?.sector || "",
    },
    lastSuccessfulUpdateAt: latestHistory?.createdAt || activeManagedPrices[0]?.updatedAt || null,
    cropsManaged: new Set(activeManagedPrices.map((price) => price.cropName)).size,
    pricesUpdatedToday,
    activeMarkets: new Set(activeManagedPrices.map((price) => price.marketName)).size,
    latestPriceChange: latestHistory
      ? {
          cropName: latestHistory.cropName,
          marketName: latestHistory.marketName,
          effectiveDate: latestHistory.effectiveDate,
          changedAt: latestHistory.createdAt,
          changedBy: latestHistory.changedBy ? { id: latestHistory.changedBy.id, fullName: latestHistory.changedBy.fullName } : null,
          ...latestSummary,
        }
      : null,
    recentUpdates,
    cropsRequiringAttention,
  };
}

async function exportCropPricesPdf() {
  const prices = await prisma.cropPrice.findMany({
    where: { status: "Active" },
    orderBy: [{ cropName: "asc" }, { marketName: "asc" }],
  });

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Official Crop Prices Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toISOString().split("T")[0]}`, { align: "center" });
    doc.text(`Total Active Prices: ${prices.length}`, { align: "center" });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const headers = ["Crop", "Market", "District", "Wholesale (RWF)", "Retail (RWF)", "Farm-gate (RWF)", "Unit", "Effective Date"];
    const colWidths = [70, 90, 80, 60, 55, 65, 35, 80];
    let x = 50;

    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, x, doc.y, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(8);
    for (const price of prices) {
      if (doc.y > 720) {
        doc.addPage();
      }

      x = 50;
      const row = [
        price.cropName,
        price.marketName,
        price.district,
        String(price.wholesalePrice),
        String(price.retailPrice),
        price.farmGatePrice != null ? String(price.farmGatePrice) : "N/A",
        price.unit,
        price.effectiveDate ? new Date(price.effectiveDate).toISOString().split("T")[0] : "N/A",
      ];

      row.forEach((cell, i) => {
        doc.text(cell, x, doc.y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });
      doc.moveDown(0.3);
    }

    doc.end();
  });
}

async function exportCropPricesExcel() {
  const prices = await prisma.cropPrice.findMany({
    where: { status: "Active" },
    orderBy: [{ cropName: "asc" }, { marketName: "asc" }],
  });

  const ExcelJS = require("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Crop Prices");

  sheet.columns = [
    { header: "Crop Name", key: "cropName", width: 20 },
    { header: "Variety", key: "cropVariety", width: 15 },
    { header: "Market", key: "marketName", width: 30 },
    { header: "District", key: "district", width: 22 },
    { header: "Sector", key: "sector", width: 20 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Wholesale Price", key: "wholesalePrice", width: 16 },
    { header: "Retail Price", key: "retailPrice", width: 14 },
    { header: "Farm-gate Price", key: "farmGatePrice", width: 16 },
    { header: "Effective Date", key: "effectiveDate", width: 16 },
    { header: "Status", key: "status", width: 10 },
    { header: "Source", key: "source", width: 16 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  for (const price of prices) {
    sheet.addRow({
      cropName: price.cropName,
      cropVariety: price.cropVariety || "",
      marketName: price.marketName,
      district: price.district,
      sector: price.sector || "",
      unit: price.unit,
      currency: price.currency,
      wholesalePrice: Number(price.wholesalePrice),
      retailPrice: Number(price.retailPrice),
      farmGatePrice: price.farmGatePrice != null ? Number(price.farmGatePrice) : "",
      effectiveDate: price.effectiveDate ? new Date(price.effectiveDate).toISOString().split("T")[0] : "",
      status: price.status,
      source: price.source,
      notes: price.notes || "",
    });
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A56DB" } };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  return workbook.xlsx.writeBuffer();
}

async function exportPriceHistoryPdf({ cropName, marketName, district } = {}) {
  const where = {};
  if (cropName) where.cropName = cropName;
  if (marketName) where.marketName = marketName;
  if (district) where.district = district;

  const history = await prisma.cropPriceHistory.findMany({
    where,
    include: { changedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Crop Price History Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toISOString().split("T")[0]}`, { align: "center" });
    doc.text(`Total Records: ${history.length}`, { align: "center" });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    for (const entry of history) {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1a56db").text(`${entry.cropName} - ${entry.marketName}`);
      doc.moveDown(0.2);
      doc.fontSize(9).font("Helvetica").fillColor("#000");
      doc.text(`District: ${entry.district}`);
      doc.text(`Old Wholesale: ${entry.oldWholesale} RWF  ->  New Wholesale: ${entry.newWholesale} RWF`);
      doc.text(`Old Retail: ${entry.oldRetail} RWF  ->  New Retail: ${entry.newRetail} RWF`);
      doc.text(`Changed by: ${entry.changedBy?.fullName || "System"}  |  Reason: ${entry.reason}`);
      doc.text(`Date: ${entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0] : "N/A"}`);
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
      doc.moveDown(0.5);
    }

    doc.end();
  });
}

async function exportPriceHistoryExcel({ cropName, marketName, district } = {}) {
  const where = {};
  if (cropName) where.cropName = cropName;
  if (marketName) where.marketName = marketName;
  if (district) where.district = district;

  const history = await prisma.cropPriceHistory.findMany({
    where,
    include: { changedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const ExcelJS = require("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Price History");

  sheet.columns = [
    { header: "Crop Name", key: "cropName", width: 20 },
    { header: "Market", key: "marketName", width: 30 },
    { header: "District", key: "district", width: 22 },
    { header: "Old Wholesale", key: "oldWholesale", width: 16 },
    { header: "New Wholesale", key: "newWholesale", width: 16 },
    { header: "Old Retail", key: "oldRetail", width: 14 },
    { header: "New Retail", key: "newRetail", width: 14 },
    { header: "Changed By", key: "changedBy", width: 20 },
    { header: "Reason", key: "reason", width: 30 },
    { header: "Date", key: "createdAt", width: 16 },
  ];

  for (const entry of history) {
    sheet.addRow({
      cropName: entry.cropName,
      marketName: entry.marketName,
      district: entry.district,
      oldWholesale: Number(entry.oldWholesale),
      newWholesale: Number(entry.newWholesale),
      oldRetail: Number(entry.oldRetail),
      newRetail: Number(entry.newRetail),
      changedBy: entry.changedBy?.fullName || "System",
      reason: entry.reason,
      createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0] : "",
    });
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A56DB" } };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  CROP_LIST,
  listCropPrices,
  getCurrentPrices,
  getCurrentPriceByCrop,
  getCurrentOfficialPrice,
  createCropPrice,
  updateCropPrice,
  deactivateCropPrice,
  getPriceHistory,
  getOfficialPrices,
  getMarketOfficerDashboard,
  exportCropPricesPdf,
  exportCropPricesExcel,
  exportPriceHistoryPdf,
  exportPriceHistoryExcel,
};

