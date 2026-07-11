const asyncHandler = require("../utils/asyncHandler");
const recommendationService = require("../services/recommendationService");

const generateRecommendationRun = asyncHandler(async (req, res) => {
  const run = await recommendationService.generateRecommendationRun(
    req.user,
    req.validated.params.farmId,
    req.validated.body || {},
  );

  res.status(201).json({
    success: true,
    message: "AI recommendations generated successfully.",
    data: run,
  });
});

const getLatestRecommendationRun = asyncHandler(async (req, res) => {
  const run = await recommendationService.getLatestRecommendationRun(
    req.user,
    req.validated.params.farmId,
  );

  res.json({
    success: true,
    data: run,
  });
});

const listRecommendationRunHistory = asyncHandler(async (req, res) => {
  const history = await recommendationService.listRecommendationRunHistory(
    req.user,
    req.validated.params.farmId,
  );

  res.json({
    success: true,
    data: history,
  });
});

const listRecommendationFeedback = asyncHandler(async (req, res) => {
  const feedback = await recommendationService.listRecommendationFeedback(
    req.user,
    req.validated.params.runId,
  );

  res.json({
    success: true,
    data: feedback,
  });
});

const addRecommendationFeedback = asyncHandler(async (req, res) => {
  const feedback = await recommendationService.addRecommendationFeedback(
    req.user,
    req.validated.params.runId,
    req.validated.body,
  );

  res.status(201).json({
    success: true,
    message: "Recommendation feedback recorded successfully.",
    data: feedback,
  });
});

const exportRecommendationPdf = asyncHandler(async (req, res) => {
  const buffer = await recommendationService.exportRecommendationPdf(
    req.user,
    req.params.farmId,
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="recommendation-report.pdf"');
  res.send(buffer);
});

const exportRecommendationExcel = asyncHandler(async (req, res) => {
  const buffer = await recommendationService.exportRecommendationExcel(
    req.user,
    req.params.farmId,
  );

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="recommendation-report.xlsx"');
  res.send(buffer);
});

module.exports = {
  generateRecommendationRun,
  getLatestRecommendationRun,
  listRecommendationRunHistory,
  listRecommendationFeedback,
  addRecommendationFeedback,
  exportRecommendationPdf,
  exportRecommendationExcel,
};
