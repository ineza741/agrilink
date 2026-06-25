const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { calculateProfileCompleteness } = require("../utils/profileCompleteness");
const { createAuditLog } = require("./auditLogService");

function farmerInclude() {
  return {
    user: {
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    farms: {
      include: {
        cropHistories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    },
  };
}

function normalizeFarmerStatus(farmer) {
  if (!farmer?.user?.isActive || farmer?.verificationStatus === "Deactivated") {
    return "Deactivated";
  }

  if (farmer?.verificationStatus === "Rejected") {
    return "Rejected";
  }

  if (farmer?.verificationStatus === "Verified") {
    return "Verified";
  }

  return "Pending";
}

function enrichFarmerRecord(farmer) {
  const farms = Array.isArray(farmer?.farms) ? farmer.farms : [];
  const totalFarmSize = farms.reduce((sum, farm) => sum + Number(farm?.farmSize || 0), 0);
  const primaryFarm = farms[0] || null;
  const latestActivityAt =
    farms
      .flatMap((farm) => [
        farm?.updatedAt ? new Date(farm.updatedAt).getTime() : 0,
        ...(Array.isArray(farm?.cropHistories)
          ? farm.cropHistories.map((entry) =>
              entry?.createdAt ? new Date(entry.createdAt).getTime() : 0
            )
          : []),
      ])
      .filter(Boolean)
      .sort((a, b) => b - a)[0] || new Date(farmer.updatedAt || farmer.createdAt).getTime();

  return {
    ...farmer,
    adminStatus: normalizeFarmerStatus(farmer),
    farmCount: farms.length,
    verifiedFarmCount: farms.filter((farm) => farm?.currentCrop).length,
    totalFarmSize,
    totalFarmSizeUnit: primaryFarm?.farmSizeUnit || "hectares",
    primaryFarmName: primaryFarm?.farmName || null,
    primaryFarmCrop: primaryFarm?.currentCrop || farmer.primaryCrop || null,
    latestActivityAt: new Date(latestActivityAt).toISOString(),
    hasStarterFarm: farms.length > 0,
    hasMultipleFarms: farms.length > 1,
  };
}

async function getMyProfile(user) {
  if (user.role !== "Farmer" || !user.farmerProfile) {
    throw new ApiError(404, "Farmer profile not found for the authenticated user.");
  }

  return prisma.farmerProfile.findUnique({
    where: { id: user.farmerProfile.id },
    include: farmerInclude(),
  });
}

async function updateMyProfile(user, payload) {
  if (user.role !== "Farmer" || !user.farmerProfile) {
    throw new ApiError(404, "Farmer profile not found for the authenticated user.");
  }

  const mergedUser = {
    ...user,
    fullName: payload.fullName || user.fullName,
    phone: payload.phone || user.phone,
  };

  const mergedProfile = {
    ...user.farmerProfile,
    region: payload.region || user.farmerProfile.region,
    district: payload.district || user.farmerProfile.district,
    sector: payload.sector || user.farmerProfile.sector,
    experienceLevel: payload.experienceLevel || user.farmerProfile.experienceLevel,
    primaryCrop: payload.primaryCrop || user.farmerProfile.primaryCrop,
  };

  const profileCompleteness = calculateProfileCompleteness({
    user: mergedUser,
    profile: mergedProfile,
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: payload.fullName,
      phone: payload.phone,
      farmerProfile: {
        update: {
          region: payload.region,
          district: payload.district,
          sector: payload.sector,
          experienceLevel: payload.experienceLevel,
          primaryCrop: payload.primaryCrop,
          profileCompleteness,
        },
      },
    },
    include: {
      farmerProfile: true,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "UPDATE_FARMER_PROFILE",
    entityType: "FarmerProfile",
    entityId: updated.farmerProfile.id,
    details: payload,
  });

  return prisma.farmerProfile.findUnique({
    where: { id: updated.farmerProfile.id },
    include: farmerInclude(),
  });
}

async function listFarmers() {
  const farmers = await prisma.farmerProfile.findMany({
    include: farmerInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return farmers.map(enrichFarmerRecord);
}

async function getFarmerById(id) {
  const farmer = await prisma.farmerProfile.findUnique({
    where: { id },
    include: farmerInclude(),
  });

  if (!farmer) {
    throw new ApiError(404, "Farmer profile not found.");
  }

  return enrichFarmerRecord(farmer);
}

async function updateFarmerStatus({ actorUser, farmerId, verificationStatus, isActive, reason, action }) {
  const farmer = await prisma.farmerProfile.findUnique({
    where: { id: farmerId },
    include: {
      user: true,
    },
  });

  if (!farmer) {
    throw new ApiError(404, "Farmer profile not found.");
  }

  const updated = await prisma.farmerProfile.update({
    where: { id: farmerId },
    data: {
      verificationStatus,
      reviewNotes: reason || null,
      user: {
        update: {
          isActive,
        },
      },
    },
    include: farmerInclude(),
  });

  await createAuditLog({
    actorUserId: actorUser.id,
    action,
    entityType: "FarmerProfile",
    entityId: farmerId,
    details: {
      verificationStatus,
      isActive,
      reason: reason || null,
    },
  });

  return enrichFarmerRecord(updated);
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  listFarmers,
  getFarmerById,
  updateFarmerStatus,
};
