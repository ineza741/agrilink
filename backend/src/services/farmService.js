const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

async function resolveFarmerProfileForUser(user) {
  if (user.role !== "Farmer" || !user.farmerProfile) {
    throw new ApiError(403, "Only farmers can manage their own farms.");
  }

  return prisma.farmerProfile.findUnique({
    where: { id: user.farmerProfile.id },
  });
}

async function ensureFarmAccess(user, farmId) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      farmerProfile: {
        include: {
          user: true,
        },
      },
      cropHistories: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!farm) {
    throw new ApiError(404, "Farm not found.");
  }

  if (user.role === "Admin" || user.role === "ExtensionOfficer") {
    return farm;
  }

  if (user.role === "Farmer" && farm.farmerProfile.userId === user.id) {
    return farm;
  }

  throw new ApiError(403, "You do not have access to this farm.");
}

async function createFarm(user, payload) {
  const farmerProfile = await resolveFarmerProfileForUser(user);

  const farm = await prisma.farm.create({
    data: {
      ...payload,
      farmerProfileId: farmerProfile.id,
    },
    include: {
      cropHistories: true,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "CREATE_FARM",
    entityType: "Farm",
    entityId: farm.id,
    details: {
      farmName: farm.farmName,
      district: farm.district,
    },
  });

  return farm;
}

async function listMyFarms(user) {
  const farmerProfile = await resolveFarmerProfileForUser(user);

  return prisma.farm.findMany({
    where: {
      farmerProfileId: farmerProfile.id,
    },
    include: {
      cropHistories: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function listFarms() {
  return prisma.farm.findMany({
    include: {
      farmerProfile: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      cropHistories: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getFarmById(user, farmId) {
  return ensureFarmAccess(user, farmId);
}

async function updateFarm(user, farmId, payload) {
  await ensureFarmAccess(user, farmId);

  const updated = await prisma.farm.update({
    where: { id: farmId },
    data: payload,
    include: {
      cropHistories: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_FARM",
    entityType: "Farm",
    entityId: farmId,
    details: payload,
  });

  return updated;
}

async function deleteFarm(user, farmId) {
  const farm = await ensureFarmAccess(user, farmId);

  await prisma.farm.delete({
    where: { id: farmId },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "DELETE_FARM",
    entityType: "Farm",
    entityId: farmId,
    details: {
      farmName: farm.farmName,
    },
  });

  return { deleted: true };
}

module.exports = {
  createFarm,
  listMyFarms,
  listFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
  ensureFarmAccess,
};
