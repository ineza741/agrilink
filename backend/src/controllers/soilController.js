const asyncHandler = require("../utils/asyncHandler");
const soilService = require("../services/soilService");

const createSoilTest = asyncHandler(async (req, res) => {
  const soilTest = await soilService.createSoilTest(req.user, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Soil test created successfully.",
    data: soilTest,
  });
});

const listSoilTestsByFarm = asyncHandler(async (req, res) => {
  const soilTests = await soilService.listSoilTestsByFarm(req.user, req.validated.params.farmId);
  res.json({ success: true, data: soilTests });
});

const updateSoilTest = asyncHandler(async (req, res) => {
  const soilTest = await soilService.updateSoilTest(req.user, req.validated.params.id, req.validated.body);
  res.json({
    success: true,
    message: "Soil test updated successfully.",
    data: soilTest,
  });
});

const deleteSoilTest = asyncHandler(async (req, res) => {
  const result = await soilService.deleteSoilTest(req.user, req.validated.params.id);
  res.json({
    success: true,
    message: "Soil test deleted successfully.",
    data: result,
  });
});

const analyzeSoilTest = asyncHandler(async (req, res) => {
  const result = await soilService.analyzeSoilTest(req.user, req.validated.params.id);
  res.json({
    success: true,
    message: "Soil analysis completed successfully.",
    data: result,
  });
});

const getCropSuitabilityByFarm = asyncHandler(async (req, res) => {
  const result = await soilService.getCropSuitabilityByFarm(req.user, req.validated.params.farmId);
  res.json({ success: true, data: result });
});

module.exports = {
  createSoilTest,
  listSoilTestsByFarm,
  updateSoilTest,
  deleteSoilTest,
  analyzeSoilTest,
  getCropSuitabilityByFarm,
};
