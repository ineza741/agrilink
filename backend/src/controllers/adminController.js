const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/adminService");
const contentManagementService = require("../services/contentManagementService");

const getDashboardSummary = asyncHandler(async (_req, res) => {
  const summary = await adminService.getDashboardSummary();
  res.json({ success: true, data: summary });
});

const getPendingFarmers = asyncHandler(async (_req, res) => {
  const farmers = await adminService.getPendingFarmers();
  res.json({ success: true, data: farmers });
});

const getFarmerRegistryExport = asyncHandler(async (_req, res) => {
  const payload = await adminService.getFarmerRegistryExport();
  res.json({ success: true, data: payload });
});

const getRegionalMonitoringDashboard = asyncHandler(async (_req, res) => {
  const payload = await adminService.getRegionalMonitoringDashboard();
  res.json({ success: true, data: payload });
});

const createRegionalAdvisory = asyncHandler(async (req, res) => {
  const payload = await adminService.createRegionalAdvisory({
    actorUser: req.user,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: payload });
});

const updateWorkflowItem = asyncHandler(async (req, res) => {
  const payload = await adminService.updateWorkflowItem({
    actorUser: req.user,
    workflowId: req.params.id,
    status: req.body?.status,
  });
  res.json({ success: true, data: payload });
});

const getContentManagementDashboard = asyncHandler(async (_req, res) => {
  const payload = await contentManagementService.getContentManagementDashboard();
  res.json({ success: true, data: payload });
});

const createContentEntry = asyncHandler(async (req, res) => {
  const payload = await contentManagementService.createContentEntry({
    actorUser: req.user,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: payload });
});

const advanceContentEntryStatus = asyncHandler(async (req, res) => {
  const payload = await contentManagementService.advanceContentEntryStatus({
    actorUser: req.user,
    entryId: req.params.id,
  });
  res.json({ success: true, data: payload });
});

const archiveContentEntry = asyncHandler(async (req, res) => {
  const payload = await contentManagementService.archiveContentEntry({
    actorUser: req.user,
    entryId: req.params.id,
  });
  res.json({ success: true, data: payload });
});

const syncFertilizerStandards = asyncHandler(async (req, res) => {
  const payload = await contentManagementService.syncFertilizerStandards({
    actorUser: req.user,
  });
  res.json({ success: true, data: payload });
});

const testContentSandbox = asyncHandler(async (req, res) => {
  const payload = await contentManagementService.testContentSandbox({
    actorUser: req.user,
    payload: req.body,
  });
  res.json({ success: true, data: payload });
});

const saveContentSandbox = asyncHandler(async (req, res) => {
  const payload = await contentManagementService.saveContentSandbox({
    actorUser: req.user,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: payload });
});

module.exports = {
  getDashboardSummary,
  getPendingFarmers,
  getFarmerRegistryExport,
  getRegionalMonitoringDashboard,
  createRegionalAdvisory,
  updateWorkflowItem,
  getContentManagementDashboard,
  createContentEntry,
  advanceContentEntryStatus,
  archiveContentEntry,
  syncFertilizerStandards,
  testContentSandbox,
  saveContentSandbox,
};
