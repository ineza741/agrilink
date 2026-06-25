const express = require("express");

const analyticsController = require("../controllers/analyticsController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  farmAnalyticsDashboardSchema,
  farmAnalyticsHistorySchema,
  farmAnalyticsExportSchema,
  adminAnalyticsDashboardSchema,
  adminAnalyticsHistorySchema,
  adminAnalyticsExportSchema,
} = require("../validations/phase8AnalyticsSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.get(
  "/farms/:farmId/dashboard",
  validate(farmAnalyticsDashboardSchema),
  analyticsController.getFarmAnalyticsDashboard,
);

router.get(
  "/farms/:farmId/history",
  validate(farmAnalyticsHistorySchema),
  analyticsController.getFarmAnalyticsHistory,
);

router.post(
  "/farms/:farmId/export",
  validate(farmAnalyticsExportSchema),
  analyticsController.exportFarmAnalytics,
);

router.get(
  "/admin/dashboard",
  validate(adminAnalyticsDashboardSchema),
  analyticsController.getAdminAnalyticsDashboard,
);

router.get(
  "/admin/history",
  validate(adminAnalyticsHistorySchema),
  analyticsController.getAdminAnalyticsHistory,
);

router.post(
  "/admin/export",
  validate(adminAnalyticsExportSchema),
  analyticsController.exportAdminAnalytics,
);

module.exports = router;
