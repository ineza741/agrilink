const asyncHandler = require("../utils/asyncHandler");
const cropPriceService = require("../services/cropPriceService");

const listCropPrices = asyncHandler(async (req, res) => {
  const prices = await cropPriceService.listCropPrices(req.query);
  res.json({ success: true, data: prices });
});

const getCurrentPrices = asyncHandler(async (_req, res) => {
  const prices = await cropPriceService.getCurrentPrices();
  res.json({ success: true, data: prices });
});

const getCurrentOfficialPrice = asyncHandler(async (req, res) => {
  const price = await cropPriceService.getCurrentOfficialPrice({
    cropName: req.query.crop || req.query.cropName,
    marketName: req.query.market || req.query.marketName,
    district: req.query.district,
    priceType: req.query.priceType,
  });
  res.json({ success: true, data: price });
});

const getCurrentPriceByCrop = asyncHandler(async (req, res) => {
  const price = await cropPriceService.getCurrentPriceByCrop(req.validated.params.cropName);
  res.json({ success: true, data: price });
});

const createCropPrice = asyncHandler(async (req, res) => {
  const price = await cropPriceService.createCropPrice({
    payload: req.validated.body,
    user: req.user,
  });
  res.status(201).json({ success: true, message: "Crop price created successfully.", data: price });
});

const updateCropPrice = asyncHandler(async (req, res) => {
  const price = await cropPriceService.updateCropPrice({
    priceId: req.validated.params.id,
    payload: req.validated.body,
    user: req.user,
  });
  res.json({ success: true, message: "Crop price updated successfully.", data: price });
});

const deactivateCropPrice = asyncHandler(async (req, res) => {
  const price = await cropPriceService.deactivateCropPrice({
    priceId: req.validated.params.id,
    user: req.user,
  });
  res.json({ success: true, message: "Crop price deactivated.", data: price });
});

const getPriceHistory = asyncHandler(async (req, res) => {
  const history = await cropPriceService.getPriceHistory(req.query);
  res.json({ success: true, data: history });
});

const getOfficialPrices = asyncHandler(async (_req, res) => {
  const prices = await cropPriceService.getOfficialPrices();
  res.json({ success: true, data: prices });
});

const getMarketOfficerDashboard = asyncHandler(async (req, res) => {
  const dashboard = await cropPriceService.getMarketOfficerDashboard(req.user);
  res.json({ success: true, data: dashboard });
});

const exportCropPricesPdf = asyncHandler(async (_req, res) => {
  const buffer = await cropPriceService.exportCropPricesPdf();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="crop-prices.pdf"');
  res.send(buffer);
});

const exportCropPricesExcel = asyncHandler(async (_req, res) => {
  const buffer = await cropPriceService.exportCropPricesExcel();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="crop-prices.xlsx"');
  res.send(buffer);
});

const exportPriceHistoryPdf = asyncHandler(async (req, res) => {
  const buffer = await cropPriceService.exportPriceHistoryPdf(req.query);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="price-history.pdf"');
  res.send(buffer);
});

const exportPriceHistoryExcel = asyncHandler(async (req, res) => {
  const buffer = await cropPriceService.exportPriceHistoryExcel(req.query);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="price-history.xlsx"');
  res.send(buffer);
});

module.exports = {
  listCropPrices,
  getCurrentPrices,
  getCurrentOfficialPrice,
  getCurrentPriceByCrop,
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
