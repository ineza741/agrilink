const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { spawn } = require("child_process");
const asyncHandler = require("../utils/asyncHandler");
const pestService = require("../services/pestService");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "pest-images");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only JPG, PNG, and WebP images are allowed."), ok);
  },
});

const uploadDiagnosisImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No image file provided." });
  const imagePath = req.file.path;
  const imageName = req.file.filename;

  let inferenceResult = null;
  try {
    inferenceResult = await runPythonInference(imagePath);
  } catch (e) {
    inferenceResult = { error: e.message };
  }

  const libraryRecords = await pestService.listDiseaseLibrary({});
  let matched = null;
  if (inferenceResult && inferenceResult.predictedClass) {
    matched = libraryRecords.find(
      (r) => r.modelClassLabel && r.modelClassLabel.toLowerCase() === inferenceResult.predictedClass.toLowerCase()
    );
  }

  res.json({
    success: true,
    data: {
      imageName,
      imagePath: "/uploads/pest-images/" + imageName,
      inference: inferenceResult || null,
      matchedCondition: matched || null,
    },
  });
});

function runPythonInference(imagePath) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "..", "..", "scripts", "infer.py");
    if (!fs.existsSync(script)) {
      resolve({ predictedClass: null, confidence: null, message: "Inference script not found" });
      return;
    }
    const proc = spawn("python", [script, imagePath], { timeout: 30000 });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve({ predictedClass: null, confidence: null, error: stderr.trim() || "Script exited with code " + code });
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ predictedClass: null, confidence: null, raw: stdout.trim() });
      }
    });
    proc.on("error", (e) => resolve({ predictedClass: null, confidence: null, error: e.message }));
  });
}

const listLibrary = asyncHandler(async (req, res) => {
  const result = await pestService.listDiseaseLibrary(req.query);
  res.json({ success: true, ...result });
});

const listSymptoms = asyncHandler(async (req, res) => {
  if (req.query.crop) {
    const symptoms = await pestService.listSymptomsByCrop(req.query.crop);
    return res.json({ success: true, data: symptoms });
  }
  const symptoms = await pestService.listSymptoms();
  res.json({ success: true, data: symptoms });
});

const analyzePestRisk = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.analyzePestRisk(req.user, req.params.farmId, req.body);
  res.status(201).json({ success: true, message: "Pest diagnosis generated successfully.", data: diagnosis });
});

const getLatestDiagnosis = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.getLatestDiagnosis(req.user, req.params.farmId);
  res.json({ success: true, data: diagnosis });
});

const getFarmDiagnosisHistory = asyncHandler(async (req, res) => {
  const history = await pestService.getFarmDiagnosisHistory(req.user, req.params.farmId);
  res.json({ success: true, data: history });
});

const getOutbreakSummary = asyncHandler(async (req, res) => {
  const summary = await pestService.getRegionalOutbreakSummary({ district: req.query.district });
  res.json({ success: true, data: summary });
});

const acceptDiagnosis = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.updateDiagnosisStatus(req.user, req.params.diagnosisId, "Accepted");
  res.json({ success: true, message: "Recommendation accepted.", data: diagnosis });
});

const completeDiagnosis = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.updateDiagnosisStatus(req.user, req.params.diagnosisId, "Completed");
  res.json({ success: true, message: "Action marked as complete.", data: diagnosis });
});

const rejectDiagnosis = asyncHandler(async (req, res) => {
  const diagnosis = await pestService.updateDiagnosisStatus(req.user, req.params.diagnosisId, "Rejected");
  res.json({ success: true, message: "Recommendation rejected.", data: diagnosis });
});

const getDiagnosisActions = asyncHandler(async (req, res) => {
  const actions = await pestService.getDiagnosisActions(req.user, req.params.diagnosisId);
  res.json({ success: true, data: actions });
});

const addDiagnosisAction = asyncHandler(async (req, res) => {
  const action = await pestService.addDiagnosisAction(req.user, req.params.diagnosisId, req.body);
  res.status(201).json({ success: true, message: "Pest action feedback recorded successfully.", data: action });
});

module.exports = {
  listLibrary, listSymptoms, analyzePestRisk, getLatestDiagnosis, getFarmDiagnosisHistory,
  getOutbreakSummary, acceptDiagnosis, completeDiagnosis, rejectDiagnosis,
  getDiagnosisActions, addDiagnosisAction, uploadDiagnosisImage, upload,
};
