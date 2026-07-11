const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { extractSoilDataFromFile, SUPPORTED_MIME_TYPES } = require("../services/soilExtractionService");
const soilService = require("../services/soilService");
const asyncHandler = require("../utils/asyncHandler");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "soil-reports");
const MAX_FILE_SIZE = 10 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `soil-report-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (SUPPORTED_MIME_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Accepted: PDF, DOCX, JPG, JPEG, PNG`));
    }
  },
});

const uploadMiddleware = upload.single("file");

const uploadAndExtract = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file provided. Please select a file to upload.",
    });
  }

  const { filename, mimetype, size, originalname, path: filePath } = req.file;
  const farmId = req.body.farmId || null;

  try {
    const result = await extractSoilDataFromFile(filePath, mimetype);

    return res.json({
      success: true,
      message: result.success
        ? "Soil report scanned successfully."
        : "We could not read this report automatically. Please enter values manually.",
      data: {
        fileName: originalname,
        storedAs: filename,
        mimeType: mimetype,
        size,
        farmId,
        extractedValues: result.extractedValues,
        totalFieldsExtracted: result.totalFieldsExtracted,
        rawText: result.rawText,
      },
    });
  } catch (err) {
    return res.json({
      success: true,
      message: "We could not read this report automatically. Please enter values manually.",
      data: {
        fileName: originalname,
        storedAs: filename,
        mimeType: mimetype,
        size,
        farmId,
        extractedValues: null,
        totalFieldsExtracted: 0,
        rawText: "",
      },
    });
  }
});

const saveExtractedSoilTest = asyncHandler(async (req, res) => {
  const { farmId, ph, nitrogen, phosphorus, potassium, organicMatter, moisture, cec, texture, fileName, fileType, storageMode } = req.body;

  if (!farmId) {
    return res.status(400).json({ success: false, message: "farmId is required." });
  }

  const payload = {
    farmId,
    sourceType: "uploaded",
    ph: Number(ph || 0),
    nitrogen: Number(nitrogen || 0),
    phosphorus: Number(phosphorus || 0),
    potassium: Number(potassium || 0),
    organicMatter: Number(organicMatter || 0),
    texture: texture || "Loamy",
    notes: null,
    labReport: {
      fileName: fileName || "uploaded-report",
      fileType: fileType || null,
      storageMode: storageMode || "local-upload",
    },
  };

  const soilTest = await soilService.createSoilTest(req.user, payload);

  const analyzed = await soilService.analyzeSoilTest(req.user, soilTest.id);

  return res.status(201).json({
    success: true,
    message: "Soil report saved and analyzed successfully.",
    data: analyzed,
  });
});

function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File is too large. Maximum size is 10MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
}

module.exports = {
  uploadMiddleware,
  handleMulterError,
  uploadAndExtract,
  saveExtractedSoilTest,
};
