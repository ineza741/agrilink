const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  cropPriceCreateSchema,
  cropPriceUpdateSchema,
  cropPriceIdSchema,
} = require("../validations/phase1Schemas");
const cropPriceController = require("../controllers/cropPriceController");

const router = express.Router();

router.use(authenticate);

router.get("/current-price", cropPriceController.getCurrentOfficialPrice);
router.get("/current", cropPriceController.getCurrentPrices);
router.get("/official", cropPriceController.getOfficialPrices);
router.get("/history", cropPriceController.getPriceHistory);
router.get("/dashboard", authorize("MarketOfficer", "Admin", "ExtensionOfficer"), cropPriceController.getMarketOfficerDashboard);
router.get("/", cropPriceController.listCropPrices);
router.get("/crop/:cropName", cropPriceController.getCurrentPriceByCrop);

router.post(
  "/",
  authorize("MarketOfficer", "Admin", "ExtensionOfficer"),
  validate(cropPriceCreateSchema),
  cropPriceController.createCropPrice,
);

router.patch(
  "/:id",
  authorize("MarketOfficer", "Admin", "ExtensionOfficer"),
  validate(cropPriceUpdateSchema),
  cropPriceController.updateCropPrice,
);

router.patch(
  "/:id/deactivate",
  authorize("MarketOfficer", "Admin", "ExtensionOfficer"),
  validate(cropPriceIdSchema),
  cropPriceController.deactivateCropPrice,
);

router.get("/export/pdf", authorize("MarketOfficer", "Admin", "ExtensionOfficer"), cropPriceController.exportCropPricesPdf);
router.get("/export/excel", authorize("MarketOfficer", "Admin", "ExtensionOfficer"), cropPriceController.exportCropPricesExcel);
router.get("/history/export/pdf", authorize("MarketOfficer", "Admin", "ExtensionOfficer"), cropPriceController.exportPriceHistoryPdf);
router.get("/history/export/excel", authorize("MarketOfficer", "Admin", "ExtensionOfficer"), cropPriceController.exportPriceHistoryExcel);

module.exports = router;
