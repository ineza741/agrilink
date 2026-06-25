const express = require("express");

const weatherController = require("../controllers/weatherController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  farmWeatherDashboardSchema,
  farmWeatherHistorySchema,
} = require("../validations/phase9WeatherSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.get(
  "/farms/:farmId/dashboard",
  validate(farmWeatherDashboardSchema),
  weatherController.getFarmWeatherDashboard,
);

router.get(
  "/farms/:farmId/history",
  validate(farmWeatherHistorySchema),
  weatherController.getFarmWeatherHistory,
);

module.exports = router;
