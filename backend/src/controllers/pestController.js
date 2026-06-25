const asyncHandler = require("../utils/asyncHandler");
const pestService = require("../services/pestService");

const listLibrary = asyncHandler(async (req, res) => {
  const library = await pestService.listDiseaseLibrary(req.validated.query || {});
  res.json({
    success: true,
    data: library,
  });
});

const analyzePestRisk = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.analyzePestRisk(
    req.user,
    req.validated.params.farmId,
    req.validated.body
  );
  res.status(201).json({
    success: true,
    message: "Pest diagnosis generated successfully.",
    data: diagnosis,
  });
});

const getLatestDiagnosis = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.getLatestDiagnosis(req.user, req.validated.params.farmId);
  res.json({
    success: true,
    data: diagnosis,
  });
});

const getFarmDiagnosisHistory = asyncHandler(async (req, res) => {
  const history = await pestService.getFarmDiagnosisHistory(req.user, req.validated.params.farmId);
  res.json({
    success: true,
    data: history,
  });
});

const getDiagnosisActions = asyncHandler(async (req, res) => {
  const actions = await pestService.getDiagnosisActions(req.user, req.validated.params.diagnosisId);
  res.json({
    success: true,
    data: actions,
  });
});

const addDiagnosisAction = asyncHandler(async (req, res) => {
  const action = await pestService.addDiagnosisAction(req.user, req.validated.params.diagnosisId, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Pest action feedback recorded successfully.",
    data: action,
  });
});

module.exports = {
  listLibrary,
  analyzePestRisk,
  getLatestDiagnosis,
  getFarmDiagnosisHistory,
  getDiagnosisActions,
  addDiagnosisAction,
};
