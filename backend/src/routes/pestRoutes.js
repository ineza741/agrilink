const express = require("express");
const pestController = require("../controllers/pestController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.get("/symptoms", pestController.listSymptoms);
router.get("/library", pestController.listLibrary);
router.get("/outbreaks", pestController.getOutbreakSummary);
router.post("/upload-image", pestController.upload.single("image"), pestController.uploadDiagnosisImage);
router.post("/farms/:farmId/analyze", pestController.analyzePestRisk);
router.get("/farms/:farmId/latest", pestController.getLatestDiagnosis);
router.get("/farms/:farmId/history", pestController.getFarmDiagnosisHistory);
router.patch("/diagnoses/:diagnosisId/accept", pestController.acceptDiagnosis);
router.patch("/diagnoses/:diagnosisId/complete", pestController.completeDiagnosis);
router.patch("/diagnoses/:diagnosisId/reject", pestController.rejectDiagnosis);
router.get("/diagnoses/:diagnosisId/actions", pestController.getDiagnosisActions);
router.post("/diagnoses/:diagnosisId/actions", pestController.addDiagnosisAction);

module.exports = router;
