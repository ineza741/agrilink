const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const soilController = require("../controllers/soilController");
const {
  soilTestCreateSchema,
  soilTestUpdateSchema,
  soilTestIdSchema,
  farmSoilTestSchema,
} = require("../validations/phase2SoilSchemas");
const { uploadMiddleware, handleMulterError, uploadAndExtract, saveExtractedSoilTest } = require("../controllers/soilUploadController");

const router = express.Router();

router.use(authenticate);

router.post("/soil-tests/upload", authorize("Farmer", "Admin", "ExtensionOfficer"), uploadMiddleware, uploadAndExtract);
router.post("/soil-tests/upload/save", authorize("Farmer", "Admin", "ExtensionOfficer"), saveExtractedSoilTest);
router.post("/soil-tests", authorize("Farmer", "Admin", "ExtensionOfficer"), validate(soilTestCreateSchema), soilController.createSoilTest);
router.get("/soil-tests/farm/:farmId", authorize("Farmer", "Admin", "ExtensionOfficer"), validate(farmSoilTestSchema), soilController.listSoilTestsByFarm);
router.put("/soil-tests/:id", authorize("Farmer", "Admin", "ExtensionOfficer"), validate(soilTestUpdateSchema), soilController.updateSoilTest);
router.delete("/soil-tests/:id", authorize("Farmer", "Admin", "ExtensionOfficer"), validate(soilTestIdSchema), soilController.deleteSoilTest);
router.post("/soil-tests/:id/analyze", authorize("Farmer", "Admin", "ExtensionOfficer"), validate(soilTestIdSchema), soilController.analyzeSoilTest);
router.get("/crop-suitability/farm/:farmId", authorize("Farmer", "Admin", "ExtensionOfficer"), validate(farmSoilTestSchema), soilController.getCropSuitabilityByFarm);

module.exports = router;
