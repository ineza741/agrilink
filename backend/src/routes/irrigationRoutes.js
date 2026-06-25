const express = require("express");

const irrigationController = require("../controllers/irrigationController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  irrigationCalculationSchema,
  irrigationLatestSchema,
  irrigationReminderCreateSchema,
  irrigationReminderListSchema,
  irrigationReminderUpdateSchema,
  irrigationReminderDeleteSchema,
} = require("../validations/phase3IrrigationSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.post(
  "/farms/:farmId/calculate",
  validate(irrigationCalculationSchema),
  irrigationController.calculateIrrigationAdvisory,
);

router.get(
  "/farms/:farmId/latest",
  validate(irrigationLatestSchema),
  irrigationController.getLatestIrrigationAdvisory,
);

router.get(
  "/farms/:farmId/reminders",
  validate(irrigationReminderListSchema),
  irrigationController.listFarmReminders,
);

router.post(
  "/farms/:farmId/reminders",
  validate(irrigationReminderCreateSchema),
  irrigationController.createFarmReminder,
);

router.put(
  "/reminders/:id",
  validate(irrigationReminderUpdateSchema),
  irrigationController.updateFarmReminder,
);

router.delete(
  "/reminders/:id",
  validate(irrigationReminderDeleteSchema),
  irrigationController.deleteFarmReminder,
);

module.exports = router;
