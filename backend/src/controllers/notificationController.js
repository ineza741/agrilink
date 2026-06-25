const asyncHandler = require("../utils/asyncHandler");
const notificationService = require("../services/notificationService");

const getNotificationCenter = asyncHandler(async (req, res) => {
  const data = await notificationService.getNotificationCenter(
    req.user,
    req.validated.query?.farmId,
  );

  res.json({
    success: true,
    data,
  });
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const preference = await notificationService.updateNotificationPreferences(
    req.user,
    req.validated.body,
  );

  res.json({
    success: true,
    message: "Notification preferences updated successfully.",
    data: preference,
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const alerts = await notificationService.markAllNotificationsRead(
    req.user,
    req.validated.body?.farmId,
  );

  res.json({
    success: true,
    message: "All notifications marked as read.",
    data: alerts,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const alert = await notificationService.markNotificationRead(
    req.user,
    req.validated.params.id,
  );

  res.json({
    success: true,
    message: "Notification marked as read.",
    data: alert,
  });
});

const confirmNotification = asyncHandler(async (req, res) => {
  const alert = await notificationService.confirmNotification(
    req.user,
    req.validated.params.id,
  );

  res.json({
    success: true,
    message: "Notification confirmed successfully.",
    data: alert,
  });
});

const archiveNotification = asyncHandler(async (req, res) => {
  const alert = await notificationService.archiveNotification(
    req.user,
    req.validated.params.id,
  );

  res.json({
    success: true,
    message: "Notification archived successfully.",
    data: alert,
  });
});

const snoozeNotification = asyncHandler(async (req, res) => {
  const alert = await notificationService.snoozeNotification(
    req.user,
    req.validated.params.id,
    req.validated.body?.hours,
  );

  res.json({
    success: true,
    message: "Notification snoozed successfully.",
    data: alert,
  });
});

const updateTemplateStatus = asyncHandler(async (req, res) => {
  const template = await notificationService.updateTemplateStatus(
    req.user,
    req.validated.params.id,
    req.validated.body?.status,
  );

  res.json({
    success: true,
    message: "Notification template updated successfully.",
    data: template,
  });
});

module.exports = {
  getNotificationCenter,
  updateNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  confirmNotification,
  archiveNotification,
  snoozeNotification,
  updateTemplateStatus,
};
