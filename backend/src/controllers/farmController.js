const asyncHandler = require("../utils/asyncHandler");
const farmService = require("../services/farmService");

const createFarm = asyncHandler(async (req, res) => {
  const farm = await farmService.createFarm(req.user, req.validated.body);
  res.status(201).json({ success: true, message: "Farm created successfully.", data: farm });
});

const listMyFarms = asyncHandler(async (req, res) => {
  const farms = await farmService.listMyFarms(req.user);
  res.json({ success: true, data: farms });
});

const listFarms = asyncHandler(async (_req, res) => {
  const farms = await farmService.listFarms();
  res.json({ success: true, data: farms });
});

const getFarmById = asyncHandler(async (req, res) => {
  const farm = await farmService.getFarmById(req.user, req.validated.params.id);
  res.json({ success: true, data: farm });
});

const updateFarm = asyncHandler(async (req, res) => {
  const farm = await farmService.updateFarm(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, message: "Farm updated successfully.", data: farm });
});

const deleteFarm = asyncHandler(async (req, res) => {
  const result = await farmService.deleteFarm(req.user, req.validated.params.id);
  res.json({ success: true, message: "Farm deleted successfully.", data: result });
});

module.exports = {
  createFarm,
  listMyFarms,
  listFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
};
