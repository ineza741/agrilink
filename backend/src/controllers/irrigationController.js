const asyncHandler = require("../utils/asyncHandler");
const irrigationService = require("../services/irrigationService");

const calculateIrrigationAdvisory = asyncHandler(async (req, res) => {
  const advisory = await irrigationService.calculateIrrigationAdvisory(
    req.user,
    req.validated.params.farmId,
    req.validated.body,
  );

  res.status(201).json({
    success: true,
    message: "Irrigation and fertilizer advisory calculated successfully.",
    data: advisory,
  });
});

const getLatestIrrigationAdvisory = asyncHandler(async (req, res) => {
  const advisory = await irrigationService.getLatestIrrigationAdvisory(req.user, req.validated.params.farmId);
  res.json({
    success: true,
    data: advisory,
  });
});

const listFarmReminders = asyncHandler(async (req, res) => {
  const reminders = await irrigationService.listFarmReminders(req.user, req.validated.params.farmId);
  res.json({
    success: true,
    data: reminders,
  });
});

const createFarmReminder = asyncHandler(async (req, res) => {
  const reminder = await irrigationService.createFarmReminder(req.user, req.validated.params.farmId, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Farm reminder created successfully.",
    data: reminder,
  });
});

const updateFarmReminder = asyncHandler(async (req, res) => {
  const reminder = await irrigationService.updateFarmReminder(req.user, req.validated.params.id, req.validated.body);
  res.json({
    success: true,
    message: "Farm reminder updated successfully.",
    data: reminder,
  });
});

const deleteFarmReminder = asyncHandler(async (req, res) => {
  const result = await irrigationService.deleteFarmReminder(req.user, req.validated.params.id);
  res.json({
    success: true,
    message: "Farm reminder deleted successfully.",
    data: result,
  });
});

// --- Irrigation Records ---

const createIrrigationRecord = asyncHandler(async (req, res) => {
  const record = await irrigationService.createIrrigationRecord(
    req.user,
    req.validated.params.farmId,
    req.validated.body,
  );

  res.status(201).json({
    success: true,
    message: "Irrigation record created successfully.",
    data: record,
  });
});

const listIrrigationRecords = asyncHandler(async (req, res) => {
  const records = await irrigationService.listIrrigationRecords(
    req.user,
    req.validated.params.farmId,
    req.validated.query,
  );

  res.json({
    success: true,
    data: records,
  });
});

const updateIrrigationRecord = asyncHandler(async (req, res) => {
  const record = await irrigationService.updateIrrigationRecord(
    req.user,
    req.validated.params.recordId,
    req.validated.body,
  );

  res.json({
    success: true,
    message: "Irrigation record updated successfully.",
    data: record,
  });
});

// --- Soil Moisture ---

const createSoilMoisture = asyncHandler(async (req, res) => {
  const record = await irrigationService.createSoilMoisture(
    req.user,
    req.validated.params.farmId,
    req.validated.body,
  );

  res.status(201).json({
    success: true,
    message: "Soil moisture recorded successfully.",
    data: record,
  });
});

const getLatestSoilMoisture = asyncHandler(async (req, res) => {
  const record = await irrigationService.getLatestSoilMoisture(
    req.user,
    req.validated.params.farmId,
  );

  res.json({
    success: true,
    data: record,
  });
});

module.exports = {
  calculateIrrigationAdvisory,
  getLatestIrrigationAdvisory,
  listFarmReminders,
  createFarmReminder,
  updateFarmReminder,
  deleteFarmReminder,
  createIrrigationRecord,
  listIrrigationRecords,
  updateIrrigationRecord,
  createSoilMoisture,
  getLatestSoilMoisture,
};
