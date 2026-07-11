const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

const PDFParse = pdfParse.PDFParse || pdfParse;

function confidence(value) {
  return value != null && value !== "" ? 85 : 0;
}

function parseSoilValues(text) {
  const result = {
    ph: { value: null, confidence: 0 },
    nitrogen: { value: null, confidence: 0 },
    phosphorus: { value: null, confidence: 0 },
    potassium: { value: null, confidence: 0 },
    organicMatter: { value: null, confidence: 0 },
    moisture: { value: null, confidence: 0 },
    cec: { value: null, confidence: 0 },
    texture: { value: null, confidence: 0 },
    labName: { value: null, confidence: 0 },
    testDate: { value: null, confidence: 0 },
    farmName: { value: null, confidence: 0 },
  };

  const patterns = {
    ph: [
      /pH\s*(?:Level|value|reading)?\s*[:\-]?\s*([\d.]+)/i,
      /Soil\s*pH\s*[:\-]?\s*([\d.]+)/i,
      /pH\s*=\s*([\d.]+)/i,
    ],
    nitrogen: [
      /Nitrogen\s*(?:\(N\))?\s*[:\-]?\s*([\d.]+)\s*(?:ppm|mg\/kg|%)?/i,
      /(?:Total\s*)?Nitrogen\s*[:\-]?\s*([\d.]+)/i,
      /(?:^|\n)\s*N\s*[:\-]\s*([\d.]+)\s*(?:ppm|mg\/kg|%)?/im,
    ],
    phosphorus: [
      /Phosphorus\s*(?:\(P\))?\s*[:\-]?\s*([\d.]+)\s*(?:ppm|mg\/kg|%)?/i,
      /Available\s*P\s*[:\-]?\s*([\d.]+)/i,
      /(?:^|\n)\s*P\s*[:\-]\s*([\d.]+)\s*(?:ppm|mg\/kg|%)?/im,
    ],
    potassium: [
      /Potassium\s*(?:\(K\))?\s*[:\-]?\s*([\d.]+)\s*(?:ppm|mg\/kg|%)?/i,
      /Available\s*K\s*[:\-]?\s*([\d.]+)/i,
      /(?:^|\n)\s*K\s*[:\-]\s*([\d.]+)\s*(?:ppm|mg\/kg|%)?/im,
    ],
    organicMatter: [
      /Organic\s*(?:matter|Matter|Matter\s*\(OM\))?\s*[:\-]?\s*([\d.]+)\s*%/i,
      /O\.?M\.?\s*[:\-]?\s*([\d.]+)\s*%/i,
      /OM\s*[:\-]?\s*([\d.]+)/i,
      /Organic\s*Carbon.*?([\d.]+)/i,
    ],
    moisture: [
      /(?:Soil\s*)?Moisture\s*[:\-]?\s*([\d.]+)\s*%/i,
      /Moisture\s*content\s*[:\-]?\s*([\d.]+)/i,
      /Water\s*content\s*[:\-]?\s*([\d.]+)/i,
    ],
    cec: [
      /CEC\s*[:\-]?\s*([\d.]+)\s*(?:meq\/100g|cmol\/kg)?/i,
      /Cation\s*Exchange\s*Capacity\s*[:\-]?\s*([\d.]+)/i,
    ],
    texture: [
      /Texture\s*[:\-]?\s*(Loamy|Clay|Sandy|Silt|Peaty|Chalky|Loam|Clay Loam|Sandy Clay|Silty Clay|Sandy Loam|Silty Loam|Sandy Clay Loam|Silty Clay Loam|Calcareous|Volcanic)/i,
      /Texture\s*[:\-]?\s*([A-Za-z\s]+?)(?:\s*\n|\s*$)/im,
      /Soil\s*texture\s*[:\-]?\s*([A-Za-z\s]+?)(?:\s*\n|\s*$)/im,
    ],
    labName: [
      /(?:Lab|Laboratory|Institute)\s*(?:Name|:)?\s*[:,\-]?\s*(.+?)(?:\n|$)/i,
      /(?:Analyzed|Tested)\s*(?:by|at)\s*:\s*(.+?)(?:\n|$)/i,
    ],
    testDate: [
      /(?:Test|Analysis|Sample|Report)\s*(?:Date|date|Date:)\s*[:\-]?\s*([\d]{1,4}[-/][\d]{1,2}[-/][\d]{1,4})/i,
      /Date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,
    ],
    farmName: [
      /(?:Farm|Farmer|Client)\s*(?:Name|:)?\s*[:,\-]?\s*(.+?)(?:\n|$)/i,
      /(?:Sample|Field)\s*(?:location|from|name)\s*[:\-]?\s*(.+?)(?:\n|$)/i,
    ],
  };

  for (const [field, regexps] of Object.entries(patterns)) {
    for (const regex of regexps) {
      const match = text.match(regex);
      if (match) {
        let value = match[1].trim();
        if (field === "texture" || field === "labName" || field === "farmName") {
          value = value.replace(/\s+/g, " ").trim();
        } else if (field === "testDate") {
          result[field] = { value, confidence: 70 };
        } else {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            result[field] = { value: num, confidence: 80 };
          }
        }
        if (result[field].confidence > 0 && field !== "testDate") {
          break;
        }
      }
    }
  }

  return result;
}

async function extractTextFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer), verbosity: 0 });
  const doc = await parser.load();
  const textResult = await parser.getText();
  return textResult.text || "";
}

async function extractTextFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
}

async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, "eng", {
    logger: () => {},
  });
  return result.data.text || "";
}

const SUPPORTED_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "image",
  "image/png": "image",
  "image/jpg": "image",
};

async function extractSoilDataFromFile(filePath, mimeType) {
  const type = SUPPORTED_MIME_TYPES[mimeType];
  if (!type) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  let rawText = "";

  try {
    if (type === "pdf") {
      rawText = await extractTextFromPdf(filePath);
    } else if (type === "docx") {
      rawText = await extractTextFromDocx(filePath);
    } else if (type === "image") {
      rawText = await extractTextFromImage(filePath);
    }
  } catch (err) {
    throw new Error(`Failed to extract text from file: ${err.message}`);
  }

  const extractedValues = parseSoilValues(rawText);

  const anyExtracted = Object.values(extractedValues).some(
    (v) => v.value != null && v.value !== ""
  );

  return {
    success: anyExtracted,
    rawText: rawText.substring(0, 5000),
    extractedValues,
    totalFieldsExtracted: Object.values(extractedValues).filter(
      (v) => v.value != null && v.value !== ""
    ).length,
  };
}

module.exports = {
  extractSoilDataFromFile,
  SUPPORTED_MIME_TYPES,
};
