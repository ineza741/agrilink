const express = require("express");

const notificationController = require("../controllers/notificationController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  notificationCenterSchema,
  notificationPreferencesUpdateSchema,
  notificationActionSchema,
  notificationSnoozeSchema,
  notificationMarkAllReadSchema,
  notificationTemplateStatusSchema,
} = require("../validations/phase7NotificationSchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.get(
  "/center",
  validate(notificationCenterSchema),
  notificationController.getNotificationCenter,
);

router.put(
  "/preferences",
  validate(notificationPreferencesUpdateSchema),
  notificationController.updateNotificationPreferences,
);

router.put(
  "/mark-all-read",
  validate(notificationMarkAllReadSchema),
  notificationController.markAllNotificationsRead,
);

router.put(
  "/templates/:id/status",
  validate(notificationTemplateStatusSchema),
  notificationController.updateTemplateStatus,
);

router.put(
  "/:id/read",
  validate(notificationActionSchema),
  notificationController.markNotificationRead,
);

router.put(
  "/:id/confirm",
  validate(notificationActionSchema),
  notificationController.confirmNotification,
);

router.put(
  "/:id/archive",
  validate(notificationActionSchema),
  notificationController.archiveNotification,
);

router.put(
  "/:id/snooze",
  validate(notificationSnoozeSchema),
  notificationController.snoozeNotification,
);

module.exports = router;
