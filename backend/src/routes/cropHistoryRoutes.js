const express = require("express");
const authenticate = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const {
  cropHistorySchema,
  cropHistoryFarmIdSchema,
  cropHistoryIdSchema,
} = require("../validations/phase1Schemas");
const cropHistoryController = require("../controllers/cropHistoryController");

const router = express.Router();

router.use(authenticate);

router.post("/farms/:farmId/crop-history", validate(cropHistorySchema), cropHistoryController.createCropHistory);
router.get("/farms/:farmId/crop-history", validate(cropHistoryFarmIdSchema), cropHistoryController.getCropHistoryByFarm);
router.put("/crop-history/:id", validate(cropHistoryIdSchema), cropHistoryController.updateCropHistory);
router.delete("/crop-history/:id", validate(cropHistoryIdSchema), cropHistoryController.deleteCropHistory);

module.exports = router;
