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

module.exports = {
  calculateIrrigationAdvisory,
  getLatestIrrigationAdvisory,
  listFarmReminders,
  createFarmReminder,
  updateFarmReminder,
  deleteFarmReminder,
};
