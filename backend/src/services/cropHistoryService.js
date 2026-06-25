const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");
const { ensureFarmAccess } = require("./farmService");

async function createCropHistory(user, farmId, payload) {
  const farm = await ensureFarmAccess(user, farmId);

  const cropHistory = await prisma.cropHistory.create({
    data: {
      farmId: farm.id,
      ...payload,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "CREATE_CROP_HISTORY",
    entityType: "CropHistory",
    entityId: cropHistory.id,
    details: {
      cropName: cropHistory.cropName,
      farmId: farm.id,
    },
  });

  return cropHistory;
}

async function listCropHistory(user, farmId) {
  await ensureFarmAccess(user, farmId);

  return prisma.cropHistory.findMany({
    where: { farmId },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function updateCropHistory(user, cropHistoryId, payload) {
  const cropHistory = await prisma.cropHistory.findUnique({
    where: { id: cropHistoryId },
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

  if (!cropHistory) {
    throw new ApiError(404, "Crop history record not found.");
  }

  await ensureFarmAccess(user, cropHistory.farmId);

  const updated = await prisma.cropHistory.update({
    where: { id: cropHistoryId },
    data: payload,
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_CROP_HISTORY",
    entityType: "CropHistory",
    entityId: cropHistoryId,
    details: payload,
  });

  return updated;
}

async function deleteCropHistory(user, cropHistoryId) {
  const cropHistory = await prisma.cropHistory.findUnique({
    where: { id: cropHistoryId },
  });

  if (!cropHistory) {
    throw new ApiError(404, "Crop history record not found.");
  }

  await ensureFarmAccess(user, cropHistory.farmId);

  await prisma.cropHistory.delete({
    where: { id: cropHistoryId },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "DELETE_CROP_HISTORY",
    entityType: "CropHistory",
    entityId: cropHistoryId,
    details: {
      farmId: cropHistory.farmId,
    },
  });

  return { deleted: true };
}

module.exports = {
  createCropHistory,
  listCropHistory,
  updateCropHistory,
  deleteCropHistory,
};
