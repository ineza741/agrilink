const express = require("express");

const marketController = require("../controllers/marketController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  marketAnalyzeSchema,
  marketLatestSchema,
  marketAlertCreateSchema,
  marketAlertListSchema,
  marketAlertDeleteSchema,
} = require("../validations/phase4MarketSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.post(
  "/farms/:farmId/analyze",
  validate(marketAnalyzeSchema),
  marketController.analyzeMarket,
);

router.get(
  "/farms/:farmId/latest",
  validate(marketLatestSchema),
  marketController.getLatestMarketAnalysis,
);

router.get(
  "/farms/:farmId/alerts",
  validate(marketAlertListSchema),
  marketController.listMarketAlerts,
);

router.post(
  "/farms/:farmId/alerts",
  validate(marketAlertCreateSchema),
  marketController.createMarketAlert,
);

router.delete(
  "/alerts/:id",
  validate(marketAlertDeleteSchema),
  marketController.deleteMarketAlert,
);

module.exports = router;
