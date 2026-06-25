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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    farmerProfile: user.farmerProfile || null,
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

  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      role: "Farmer",
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
    },
    include: {
      farmerProfile: true,
    },
  });

  const score = calculateProfileCompleteness({
    user,
    profile: user.farmerProfile,
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      farmerProfile: {
        update: {
          profileCompleteness: score,
        },
      },
    },
    include: {
      farmerProfile: true,
    },
  });

  await createAuditLog({
    actorUserId: updatedUser.id,
    action: "REGISTER",
    entityType: "User",
    entityId: updatedUser.id,
    details: {
      role: updatedUser.role,
      district: updatedUser.farmerProfile?.district,
    },
  });

  const token = signAccessToken(updatedUser);

  return {
    token,
    user: serializeUser(updatedUser),
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { farmerProfile: true },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account is currently inactive.");
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
    },
  });

  if (!user) {
    throw new ApiError(404, "Authenticated user was not found.");
  }

  return serializeUser(user);
}

module.exports = {
  register,
  login,
  getAuthenticatedUser,
};
