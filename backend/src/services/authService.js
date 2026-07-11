const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { signAccessToken } = require("../utils/jwt");
const { calculateProfileCompleteness } = require("../utils/profileCompleteness");
const { createAuditLog } = require("./auditLogService");

function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    accountStatus: user.accountStatus || "APPROVED",
    approvedAt: user.approvedAt || null,
    rejectionReason: user.rejectionReason || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    farmerProfile: user.farmerProfile || null,
    marketOfficerProfile: user.marketOfficerProfile || null,
  };
}

async function register(payload) {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email }, { phone: payload.phone }],
    },
  });

  if (existingUser) {
    throw new ApiError(409, "A user with the same email or phone already exists.");
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const isMarketOfficer = payload.role === "MarketOfficer";

  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      role: isMarketOfficer ? "MarketOfficer" : "Farmer",
      accountStatus: isMarketOfficer ? "PENDING" : "APPROVED",
      ...(isMarketOfficer
        ? {
            marketOfficerProfile: {
              create: {
                fullName: payload.fullName,
                phone: payload.phone,
                marketName: payload.marketName || "",
                district: payload.district || "",
                sector: payload.sector || "",
                organization: payload.organization || null,
                employeeNumber: payload.employeeNumber || null,
                notes: payload.notes || null,
              },
            },
          }
        : {
            farmerProfile: {
              create: {
                region: payload.region,
                district: payload.district,
                sector: payload.sector,
                experienceLevel: payload.experienceLevel,
                primaryCrop: payload.primaryCrop,
                profileCompleteness: 0,
              },
            },
          }),
    },
    include: {
      farmerProfile: true,
      marketOfficerProfile: true,
    },
  });

  if (!isMarketOfficer) {
    const score = calculateProfileCompleteness({
      user,
      profile: user.farmerProfile,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        farmerProfile: {
          update: {
            profileCompleteness: score,
          },
        },
      },
    });
  }

  await createAuditLog({
    actorUserId: user.id,
    action: isMarketOfficer ? "REGISTER_MARKET_OFFICER" : "REGISTER",
    entityType: "User",
    entityId: user.id,
    details: {
      role: user.role,
      accountStatus: user.accountStatus,
      district: user.farmerProfile?.district || user.marketOfficerProfile?.district,
    },
  });

  if (isMarketOfficer) {
    return {
      message: "Registration submitted successfully. Your Market Officer account is waiting for administrator approval.",
      pendingApproval: true,
      user: serializeUser(user),
    };
  }

  const token = signAccessToken(user);

  return {
    token,
    user: serializeUser(user),
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { farmerProfile: true, marketOfficerProfile: true },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account is currently inactive.");
  }

  if (user.role === "MarketOfficer") {
    if (user.accountStatus === "PENDING") {
      throw new ApiError(403, "Your Market Officer account is awaiting administrator approval.");
    }
    if (user.accountStatus === "REJECTED") {
      const reason = user.rejectionReason
        ? ` Reason: ${user.rejectionReason}`
        : "";
      throw new ApiError(403, `Your Market Officer account has been rejected.${reason}`);
    }
    if (user.accountStatus === "SUSPENDED") {
      throw new ApiError(403, "Your account has been suspended. Contact the administrator.");
    }
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signAccessToken(user);

  await createAuditLog({
    actorUserId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    details: {
      role: user.role,
    },
  });

  return {
    token,
    user: serializeUser(user),
  };
}

async function getAuthenticatedUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      farmerProfile: {
        include: {
          farms: {
            include: {
              cropHistories: true,
            },
          },
        },
      },
      marketOfficerProfile: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "Authenticated user was not found.");
  }

  return serializeUser(user);
}

async function updateProfile(userId, payload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { marketOfficerProfile: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const updateUser = {};
  if (payload.fullName !== undefined) updateUser.fullName = payload.fullName;
  if (payload.phone !== undefined) updateUser.phone = payload.phone;

  if (Object.keys(updateUser).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: updateUser });
  }

  if (user.role === "MarketOfficer" && user.marketOfficerProfile) {
    const profileUpdate = {};
    if (payload.marketName !== undefined) profileUpdate.marketName = payload.marketName;
    if (payload.district !== undefined) profileUpdate.district = payload.district;
    if (payload.sector !== undefined) profileUpdate.sector = payload.sector;
    if (payload.organization !== undefined) profileUpdate.organization = payload.organization;

    if (Object.keys(profileUpdate).length > 0) {
      await prisma.marketOfficerProfile.update({
        where: { id: user.marketOfficerProfile.id },
        data: profileUpdate,
      });
    }
  }

  await createAuditLog({
    actorUserId: userId,
    action: "UPDATE_PROFILE",
    entityType: "User",
    entityId: userId,
    details: { fields: Object.keys(payload) },
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: { marketOfficerProfile: true },
  });

  return serializeUser(updated);
}

module.exports = {
  register,
  login,
  getAuthenticatedUser,
  updateProfile,
};
