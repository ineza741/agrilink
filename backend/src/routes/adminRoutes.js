const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(authenticate, authorize("Admin", "ExtensionOfficer"));

router.get("/dashboard-summary", adminController.getDashboardSummary);
router.get("/pending-farmers", adminController.getPendingFarmers);
router.get("/farmer-registry-export", adminController.getFarmerRegistryExport);
router.get("/regional-monitoring", adminController.getRegionalMonitoringDashboard);
router.post("/regional-advisories", adminController.createRegionalAdvisory);
router.put("/workflow/:id", adminController.updateWorkflowItem);
router.get("/content-management/dashboard", adminController.getContentManagementDashboard);
router.post("/content-management/entries", adminController.createContentEntry);
router.put("/content-management/entries/:id/status", adminController.advanceContentEntryStatus);
router.delete("/content-management/entries/:id", adminController.archiveContentEntry);
router.post("/content-management/fertilizer-sync", adminController.syncFertilizerStandards);
router.post("/content-management/sandbox/test", adminController.testContentSandbox);
router.post("/content-management/sandbox/save", adminController.saveContentSandbox);

module.exports = router;
