const express = require("express");

const pestController = require("../controllers/pestController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  pestAnalyzeSchema,
  pestFarmReadSchema,
  pestDiagnosisReadSchema,
  pestActionCreateSchema,
  pestLibrarySchema,
} = require("../validations/phase5PestSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.get("/library", validate(pestLibrarySchema), pestController.listLibrary);
router.post("/farms/:farmId/analyze", validate(pestAnalyzeSchema), pestController.analyzePestRisk);
router.get("/farms/:farmId/latest", validate(pestFarmReadSchema), pestController.getLatestDiagnosis);
router.get("/farms/:farmId/history", validate(pestFarmReadSchema), pestController.getFarmDiagnosisHistory);
router.get("/diagnoses/:diagnosisId/actions", validate(pestDiagnosisReadSchema), pestController.getDiagnosisActions);
router.post("/diagnoses/:diagnosisId/actions", validate(pestActionCreateSchema), pestController.addDiagnosisAction);

module.exports = router;
