const express = require("express");

const recommendationController = require("../controllers/recommendationController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  recommendationGenerateSchema,
  recommendationLatestSchema,
  recommendationHistorySchema,
  recommendationFeedbackCreateSchema,
  recommendationFeedbackListSchema,
} = require("../validations/phase6RecommendationSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.post(
  "/farms/:farmId/generate",
  validate(recommendationGenerateSchema),
  recommendationController.generateRecommendationRun,
);

router.get(
  "/farms/:farmId/latest",
  validate(recommendationLatestSchema),
  recommendationController.getLatestRecommendationRun,
);

router.get(
  "/farms/:farmId/history",
  validate(recommendationHistorySchema),
  recommendationController.listRecommendationRunHistory,
);

router.get(
  "/runs/:runId/feedback",
  validate(recommendationFeedbackListSchema),
  recommendationController.listRecommendationFeedback,
);

router.post(
  "/runs/:runId/feedback",
  validate(recommendationFeedbackCreateSchema),
  recommendationController.addRecommendationFeedback,
);

module.exports = router;
