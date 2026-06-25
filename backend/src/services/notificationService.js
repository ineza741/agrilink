const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

const ESCALATION_STEPS = [
  "Farmer",
  "Extension Officer",
  "District Agronomist",
  "National Alert Center",
];

const TEMPLATE_SEED = [
  {
    title: "Weather Alerts",
    category: "Weather",
    description: "Auto-generates advisories for rain deficits, heavy rainfall, strong wind, and heat stress windows.",
    status: "Published",
  },
  {
    title: "Pest Outbreaks",
    category: "Pest",
    description: "Used when weather and farmer reports indicate increasing disease or insect pressure.",
    status: "Published",
  },
  {
    title: "Market Opportunities",
    category: "Market",
    description: "Shares buyer demand signals, price alert thresholds, and best market routing advice.",
    status: "Review",
  },
  {
    title: "Irrigation Reminders",
    category: "Irrigation",
    description: "Combines soil moisture, ET, and rainfall outlook to trigger irrigation windows.",
    status: "Published",
  },
  {
    title: "Harvest Notifications",
    category: "Harvest",
    description: "Flags maturity windows, post-harvest weather risk, and expected market timing.",
    status: "Draft",
  },
];

const ADMIN_DISTRICT_SEED = [
  { farmName: "Gatenga Demonstration Plot", district: "Kicukiro District", sector: "Gatenga Sector", currentCrop: "Maize" },
  { farmName: "Nyamata Irrigation Block", district: "Bugesera District", sector: "Nyamata Sector", currentCrop: "Tomato" },
  { farmName: "Musanze Potato Cluster", district: "Musanze District", sector: "Muhoza Sector", currentCrop: "Irish Potato" },
  { farmName: "Rwamagana Maize Block", district: "Rwamagana District", sector: "Kigabiro Sector", currentCrop: "Maize" },
  { farmName: "Huye Bean Research Plot", district: "Huye District", sector: "Ngoma Sector", currentCrop: "Common Beans" },
  { farmName: "Rubavu Horticulture Zone", district: "Rubavu District", sector: "Gisenyi Sector", currentCrop: "Chili" },
];
function isoDaysAgo(days, hour = 8) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function buildDefaultPreferences() {
  return {
    delivery: {
      email: true,
      sms: true,
      push: true,
      scheduledSummary: true,
    },
    categories: {
      weather: true,
      pest: true,
      market: true,
      irrigation: true,
      analytics: true,
    },
    summaries: {
      Daily: true,
      Weekly: true,
      Monthly: false,
    },
  };
}

function isAdminFacingUser(user) {
  return user?.role === "Admin" || user?.role === "ExtensionOfficer";
}

async function resolveFarmContext(user, farmId) {
  if (farmId) {
    return ensureFarmAccess(user, farmId);
  }

  if (user.role === "Farmer" && user.farmerProfile?.id) {
    return prisma.farm.findFirst({
      where: {
        farmerProfileId: user.farmerProfile.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  return null;
}

async function ensurePreferences(userId) {
  let preference = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preference) {
    const defaults = buildDefaultPreferences();
    preference = await prisma.notificationPreference.create({
      data: {
        userId,
        delivery: defaults.delivery,
        categories: defaults.categories,
        summaries: defaults.summaries,
      },
    });
  }

  return preference;
}

async function ensureTemplates(userId) {
  const count = await prisma.notificationTemplate.count();
  if (count === 0) {
    await prisma.notificationTemplate.createMany({
      data: TEMPLATE_SEED.map((item) => ({
        ...item,
        createdByUserId: userId,
        lastUpdated: new Date(),
      })),
    });
  }

  return prisma.notificationTemplate.findMany({
    orderBy: [{ title: "asc" }],
  });
}

function buildNotificationSeed({ farm, user, latestMarket, latestPest, latestIrrigation }) {
  const farmName = farm?.farmName || "Gatenga Demonstration Plot";
  const district = farm?.district || "Kicukiro District";
  const sector = farm?.sector || "Gatenga Sector";
  const crop = farm?.currentCrop || user?.farmerProfile?.primaryCrop || "Maize";
  const marketName = latestMarket?.bestMarketName || "Kigali collection markets";
  const irrigationWindow = latestIrrigation?.scheduleEntries?.[0]?.dateKey || "tomorrow";

  return [
    {
      category: "weather",
      severity: "critical",
      source: "Weather API",
      sourceLabel: "Live Weather Data",
      title: `Severe moisture deficit detected in ${farmName}`,
      body: "No effective rainfall is expected over the next 7 days and field moisture has dropped below the comfort range for the current crop stage.",
      requiredAction: "Start irrigation within the next 12 hours and review mulch coverage.",
      recommendedAction: "Open the irrigation plan and trigger the next irrigation block today.",
      explanation: "Open-Meteo rainfall totals remain below the crop comfort range while evapotranspiration remains elevated.",
      deadline: "Today, 18:00",
      confidence: 91,
      channels: ["in-app", "sms", "push"],
      createdAt: isoDaysAgo(0, 7),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Delivered",
      relatedModule: "/irrigation-fertilizer",
      district,
      sector,
      crop,
      escalationLevel: 1,
      escalationPath: ESCALATION_STEPS,
    },
    {
      category: "pests",
      severity: "high",
      source: "AI Engine",
      sourceLabel: "Demo Pest Data",
      title: `Pest outbreak pressure increasing near ${sector}`,
      body: latestPest?.explanation?.weatherReason || "Humidity above 78% and recent canopy density reports increase insect development risk across nearby plots.",
      requiredAction: "Inspect edge rows, check trap counts, and prepare targeted IPM response.",
      recommendedAction: "Inspect hotspot rows and prepare neem-based or selective control depending on trap count.",
      explanation: "The prediction combines symptom reports, weather pressure, and prior outbreak history from nearby farms.",
      deadline: "Tomorrow, 10:00",
      confidence: latestPest?.confidence || 87,
      channels: ["in-app", "email"],
      createdAt: isoDaysAgo(0, 10),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Opened",
      relatedModule: "/pests-diseases",
      district,
      sector,
      crop,
      escalationLevel: 2,
      escalationPath: ESCALATION_STEPS,
    },
    {
      category: "market",
      severity: "info",
      source: "Market Feed",
      sourceLabel: "Demo Market Data",
      title: `${crop} demand rising in nearby markets`,
      body: `Buyer activity has improved around ${marketName}, with stronger wholesale demand for clean lots.`,
      requiredAction: "Compare transport cost against expected selling price before dispatch.",
      recommendedAction: "Hold produce for 3-5 days while monitoring the latest market opportunity score.",
      explanation: latestMarket?.aiReason || "Demand and projected price movement are improving faster than transport costs in nearby markets.",
      deadline: "Within 3 days",
      confidence: latestMarket?.aiConfidence || 79,
      channels: ["in-app", "email"],
      createdAt: isoDaysAgo(1, 9),
      read: true,
      archived: false,
      ackStatus: "confirmed",
      deliveryStatus: "Acknowledged",
      relatedModule: "/market-intelligence",
      district,
      sector,
      crop,
      escalationLevel: 0,
      escalationPath: ESCALATION_STEPS,
    },
    {
      category: "irrigation",
      severity: "warning",
      source: "Soil Sensor",
      sourceLabel: "Local Data",
      title: "Irrigation reminder window approaching",
      body: "The next irrigation window aligns with low wind speed and lower evaporative loss during the early morning period.",
      requiredAction: "Prepare irrigation set and confirm pump readiness before sunrise.",
      recommendedAction: `Apply the recommended irrigation block by ${irrigationWindow} and record the completed cycle.`,
      explanation: "Soil moisture dropped below the preferred trigger while wind and temperature conditions favor morning irrigation efficiency.",
      deadline: "Tomorrow, 05:30",
      confidence: 83,
      channels: ["in-app", "push"],
      createdAt: isoDaysAgo(1, 14),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Pending",
      relatedModule: "/irrigation-fertilizer",
      district,
      sector,
      crop,
      escalationLevel: 0,
      escalationPath: ESCALATION_STEPS,
    },
    {
      category: "analytics",
      severity: "warning",
      source: "AI Engine",
      sourceLabel: "Local Data",
      title: "Yield efficiency is trending below district benchmark",
      body: "Recent cost-weighted output suggests this farm may finish the cycle slightly below the district average unless input timing improves.",
      requiredAction: "Review nutrient timing and irrigation consistency this week.",
      recommendedAction: "Follow the advisory sequence for fertilizer timing and check irrigation compliance.",
      explanation: "The AI engine compared current cost-output behavior with local benchmark trends and recent field decisions.",
      deadline: "Within 2 days",
      confidence: 76,
      channels: ["in-app", "email"],
      createdAt: isoDaysAgo(2, 11),
      read: true,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Opened",
      relatedModule: "/analytics",
      district,
      sector,
      crop,
      escalationLevel: 1,
      escalationPath: ESCALATION_STEPS,
    },
    {
      category: "system",
      severity: "high",
      source: "Farmer Report",
      sourceLabel: "Local Data",
      title: "Field report requires extension follow-up",
      body: "A submitted field note indicates abnormal leaf yellowing near the lower terrace and requires expert review.",
      requiredAction: "Open the farmer report, verify symptoms, and attach a soil or pest follow-up action.",
      recommendedAction: "Escalate the report to the extension officer and attach field photos.",
      explanation: "Farmer reports receive higher urgency when they align with weather stress and recent nutrient warnings.",
      deadline: "Today, 16:00",
      confidence: 81,
      channels: ["in-app", "sms", "email"],
      createdAt: isoDaysAgo(0, 12),
      read: false,
      archived: false,
      ackStatus: "pending",
      deliveryStatus: "Failed",
      relatedModule: "/community",
      district,
      sector,
      crop,
      escalationLevel: 2,
      escalationPath: ESCALATION_STEPS,
    },
  ];
}

async function ensureSeedNotifications(user, farm) {
  const existing = await prisma.notificationAlert.findMany({
    where: {
      userId: user.id,
      farmId: farm?.id || null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing.length > 0) {
    return existing;
  }

  const latestMarket = farm?.id
    ? await prisma.marketAnalysis.findFirst({
        where: { farmId: farm.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const latestPest = farm?.id
    ? await prisma.pestDiagnosis.findFirst({
        where: { farmId: farm.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const latestIrrigation = farm?.id
    ? await prisma.irrigationAdvisory.findFirst({
        where: { farmId: farm.id },
        include: {
          scheduleEntries: {
            orderBy: {
              dateKey: "asc",
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const seed = buildNotificationSeed({
    farm,
    user,
    latestMarket,
    latestPest,
    latestIrrigation,
  });

  await prisma.notificationAlert.createMany({
    data: seed.map((item) => ({
      userId: user.id,
      farmId: farm?.id || null,
      category: item.category,
      severity: item.severity,
      source: item.source,
      sourceLabel: item.sourceLabel,
      title: item.title,
      body: item.body,
      requiredAction: item.requiredAction,
      recommendedAction: item.recommendedAction,
      explanation: item.explanation,
      confidence: item.confidence,
      channels: item.channels,
      deliveryStatus: item.deliveryStatus,
      ackStatus: item.ackStatus,
      read: item.read,
      archived: item.archived,
      relatedModule: item.relatedModule,
      district: item.district,
      sector: item.sector,
      crop: item.crop,
      deadline: item.deadline,
      escalationLevel: item.escalationLevel,
      escalationPath: item.escalationPath,
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
    })),
  });

  return prisma.notificationAlert.findMany({
    where: {
      userId: user.id,
      farmId: farm?.id || null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function ensureAdminSeedNotifications(user, farmId) {
  const where = farmId ? { farmId } : {};

  const existing = await prisma.notificationAlert.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: farmId ? 40 : 120,
  });

  if (farmId && existing.length > 0) {
    return existing;
  }

  const existingDistricts = new Set(existing.map((item) => item.district).filter(Boolean));

  const dbFarms = await prisma.farm.findMany({
    where: farmId ? { id: farmId } : {},
    include: {
      farmerProfile: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [{ district: "asc" }, { sector: "asc" }, { createdAt: "asc" }],
    take: farmId ? 1 : 6,
  });

  const farmSeeds = dbFarms.map((farm) => ({
    farmId: farm.id,
    farm,
    seedUser: farm.farmerProfile?.user || user,
  }));

  const fallbackSeeds = farmId
    ? []
    : ADMIN_DISTRICT_SEED.filter((item) => !existingDistricts.has(item.district)).map((farm) => ({
        farmId: null,
        farm,
        seedUser: user,
      }));

  if (existing.length >= 18 && existingDistricts.size >= 4) {
    return existing;
  }

  const seedRows = [...farmSeeds, ...fallbackSeeds].flatMap(({ farmId: currentFarmId, farm, seedUser }, farmIndex) =>
    buildNotificationSeed({ farm, user: seedUser }).map((item, alertIndex) => {
      const createdAt = new Date(item.createdAt);
      createdAt.setMinutes(createdAt.getMinutes() + farmIndex * 11 + alertIndex);

      return {
        userId: user.id,
        farmId: currentFarmId,
        category: item.category,
        severity: item.severity,
        source: item.source,
        sourceLabel: item.sourceLabel,
        title: item.title,
        body: item.body,
        requiredAction: item.requiredAction,
        recommendedAction: item.recommendedAction,
        explanation: item.explanation,
        confidence: item.confidence,
        channels: item.channels,
        deliveryStatus: item.deliveryStatus,
        ackStatus: item.ackStatus,
        read: item.read,
        archived: item.archived,
        relatedModule: item.relatedModule,
        district: item.district,
        sector: item.sector,
        crop: item.crop,
        deadline: item.deadline,
        escalationLevel: item.escalationLevel,
        escalationPath: item.escalationPath,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );

  if (seedRows.length > 0) {
    await prisma.notificationAlert.createMany({
      data: seedRows,
    });
  }

  return prisma.notificationAlert.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: farmId ? 40 : 120,
  });
}

async function ensureAlertAccess(user, id) {
  const alert = await prisma.notificationAlert.findUnique({
    where: { id },
    include: {
      farm: {
        include: {
          farmerProfile: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!alert) {
    throw new ApiError(404, "Notification alert not found.");
  }

  if (user.role === "Admin" || user.role === "ExtensionOfficer") {
    return alert;
  }

  if (alert.userId === user.id) {
    return alert;
  }

  throw new ApiError(403, "You do not have access to this notification alert.");
}

async function getNotificationCenter(user, farmId) {
  const farm = await resolveFarmContext(user, farmId);
  const preferences = await ensurePreferences(user.id);
  const templates = await ensureTemplates(user.id);

  if (isAdminFacingUser(user)) {
    const notifications = await ensureAdminSeedNotifications(user, farm?.id || null);

    return {
      activeFarmId: farm?.id || null,
      sourceMode: "backend-admin",
      preferences,
      templates,
      notifications,
    };
  }

  const notifications = await ensureSeedNotifications(user, farm);

  return {
    activeFarmId: farm?.id || null,
    sourceMode: "backend",
    preferences,
    templates,
    notifications,
  };
}

async function updateNotificationPreferences(user, payload) {
  const current = await ensurePreferences(user.id);
  const next = {
    delivery: payload.delivery || current.delivery || buildDefaultPreferences().delivery,
    categories: payload.categories || current.categories || buildDefaultPreferences().categories,
    summaries: payload.summaries || current.summaries || buildDefaultPreferences().summaries,
  };

  const preference = await prisma.notificationPreference.update({
    where: { userId: user.id },
    data: next,
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_NOTIFICATION_PREFERENCES",
    entityType: "NotificationPreference",
    entityId: preference.id,
    details: next,
  });

  return preference;
}

async function markAllNotificationsRead(user, farmId) {
  const farm = await resolveFarmContext(user, farmId);
  const where = {
    ...(isAdminFacingUser(user) ? {} : { userId: user.id }),
    ...(farm?.id ? { farmId: farm.id } : {}),
    archived: false,
  };

  await prisma.notificationAlert.updateMany({
    where,
    data: {
      read: true,
      deliveryStatus: "Opened",
      updatedAt: new Date(),
    },
  });

  return prisma.notificationAlert.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function updateAlertRecord(user, id, updater, auditAction) {
  const alert = await ensureAlertAccess(user, id);
  const nextData = updater(alert);
  const updated = await prisma.notificationAlert.update({
    where: { id },
    data: nextData,
  });

  await createAuditLog({
    actorUserId: user.id,
    action: auditAction,
    entityType: "NotificationAlert",
    entityId: id,
    details: nextData,
  });

  return updated;
}

async function markNotificationRead(user, id) {
  return updateAlertRecord(
    user,
    id,
    (alert) => ({
      read: true,
      deliveryStatus: alert.deliveryStatus === "Delivered" ? "Opened" : alert.deliveryStatus,
      updatedAt: new Date(),
    }),
    "MARK_NOTIFICATION_READ",
  );
}

async function confirmNotification(user, id) {
  return updateAlertRecord(
    user,
    id,
    () => ({
      ackStatus: "confirmed",
      read: true,
      deliveryStatus: "Acknowledged",
      updatedAt: new Date(),
    }),
    "CONFIRM_NOTIFICATION_ALERT",
  );
}

async function archiveNotification(user, id) {
  return updateAlertRecord(
    user,
    id,
    () => ({
      archived: true,
      read: true,
      updatedAt: new Date(),
    }),
    "ARCHIVE_NOTIFICATION_ALERT",
  );
}

async function snoozeNotification(user, id, hours = 6) {
  const safeHours = Number.isFinite(Number(hours)) ? Number(hours) : 6;
  const snoozedUntil = new Date();
  snoozedUntil.setHours(snoozedUntil.getHours() + safeHours);

  return updateAlertRecord(
    user,
    id,
    () => ({
      read: false,
      snoozedUntil,
      deliveryStatus: "Pending",
      updatedAt: new Date(),
    }),
    "SNOOZE_NOTIFICATION_ALERT",
  );
}

async function updateTemplateStatus(user, id, status) {
  const template = await prisma.notificationTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new ApiError(404, "Notification template not found.");
  }

  const nextStatus =
    status ||
    (template.status === "Published"
      ? "Review"
      : template.status === "Review"
        ? "Draft"
        : "Published");

  const updated = await prisma.notificationTemplate.update({
    where: { id },
    data: {
      status: nextStatus,
      lastUpdated: new Date(),
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_NOTIFICATION_TEMPLATE",
    entityType: "NotificationTemplate",
    entityId: id,
    details: {
      status: nextStatus,
    },
  });

  return updated;
}

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


