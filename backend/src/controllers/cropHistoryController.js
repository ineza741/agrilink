const asyncHandler = require("../utils/asyncHandler");
const cropHistoryService = require("../services/cropHistoryService");

const createCropHistory = asyncHandler(async (req, res) => {
  const record = await cropHistoryService.createCropHistory(req.user, req.validated.params.farmId, req.validated.body);
  res.status(201).json({ success: true, message: "Crop history saved.", data: record });
});

const getCropHistoryByFarm = asyncHandler(async (req, res) => {
  const history = await cropHistoryService.listCropHistory(req.user, req.validated.params.farmId);
  res.json({ success: true, data: history });
});

const updateCropHistory = asyncHandler(async (req, res) => {
  const updated = await cropHistoryService.updateCropHistory(req.user, req.validated.params.id, req.validated.body || {});
  res.json({ success: true, message: "Crop history updated.", data: updated });
});

const deleteCropHistory = asyncHandler(async (req, res) => {
  const result = await cropHistoryService.deleteCropHistory(req.user, req.validated.params.id);
  res.json({ success: true, message: "Crop history deleted.", data: result });
});

module.exports = {
  createCropHistory,
  getCropHistoryByFarm,
  updateCropHistory,
  deleteCropHistory,
};
