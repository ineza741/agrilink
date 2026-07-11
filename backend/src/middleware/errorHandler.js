const ApiError = require("../utils/ApiError");
const { mapZodError } = require("./validate");

function isMulterError(error) {
  return error && error.name === "MulterError";
}

function errorHandler(error, _req, res, _next) {
  const zodDetails = mapZodError(error);
  if (zodDetails) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: zodDetails,
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
    });
  }

  if (isMulterError(error)) {
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum size is 10MB."
        : error.message,
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
}

module.exports = errorHandler;
