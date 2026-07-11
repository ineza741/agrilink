const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

function serializeOfficer(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.userId,
    fullName: record.fullName,
    phone: record.phone,
    marketName: record.marketName,
    district: record.district,
    sector: record.sector,
    organization: record.organization || "",
    employeeNumber: record.employeeNumber || "",
    notes: record.notes || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    user: record.user
      ? {
          id: record.user.id,
          fullName: record.user.fullName,
          email: record.user.email,
          phone: record.user.phone,
          role: record.user.role,
          isActive: record.user.isActive,
          accountStatus: record.user.accountStatus,
          approvedAt: record.user.approvedAt,
          approvedBy: record.user.approvedBy,
          rejectionReason: record.user.rejectionReason,
          createdAt: record.user.createdAt,
          updatedAt: record.user.updatedAt,
        }
      : null,
  };
}

async function listMarketOfficers({ status, search } = {}) {
  const where = {
    user: { role: "MarketOfficer" },
  };

  if (status && status !== "All") {
    where.user.accountStatus = status;
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { marketName: { contains: search } },
      { district: { contains: search } },
      { organization: { contains: search } },
    ];
  }

  const officers = await prisma.marketOfficerProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          accountStatus: true,
          approvedAt: true,
          approvedBy: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return officers.map(serializeOfficer);
}

async function listPendingMarketOfficers() {
  const officers = await prisma.marketOfficerProfile.findMany({
    where: {
      user: { role: "MarketOfficer", accountStatus: "PENDING" },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          accountStatus: true,
          approvedAt: true,
          approvedBy: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return officers.map(serializeOfficer);
}

async function getMarketOfficerById(officerId) {
  const officer = await prisma.marketOfficerProfile.findUnique({
    where: { id: officerId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          accountStatus: true,
          approvedAt: true,
          approvedBy: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!officer) {
    throw new ApiError(404, "Market Officer not found.");
  }

  return serializeOfficer(officer);
}

async function approveMarketOfficer({ officerId, adminUser }) {
  const officer = await prisma.marketOfficerProfile.findUnique({
    where: { id: officerId },
    include: { user: true },
  });

  if (!officer) {
    throw new ApiError(404, "Market Officer not found.");
  }

  if (officer.user.accountStatus === "APPROVED") {
    throw new ApiError(400, "Market Officer account is already approved.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: officer.userId },
    data: {
      accountStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
      rejectionReason: null,
    },
  });

  await createAuditLog({
    actorUserId: adminUser.id,
    action: "APPROVE_MARKET_OFFICER",
    entityType: "User",
    entityId: officer.userId,
    details: { officerName: officer.fullName, email: officer.user.email },
  });

  await prisma.systemNotification.create({
    data: {
      userId: officer.userId,
      title: "Account Approved",
      body: "Your Market Officer account has been approved. You can now log in and manage crop prices.",
      category: "Account",
      severity: "success",
    },
  });

  return {
    userId: updatedUser.id,
    accountStatus: updatedUser.accountStatus,
    approvedAt: updatedUser.approvedAt,
  };
}

async function rejectMarketOfficer({ officerId, reason, adminUser }) {
  const officer = await prisma.marketOfficerProfile.findUnique({
    where: { id: officerId },
    include: { user: true },
  });

  if (!officer) {
    throw new ApiError(404, "Market Officer not found.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: officer.userId },
    data: {
      accountStatus: "REJECTED",
      rejectionReason: reason,
      approvedAt: null,
      approvedBy: null,
    },
  });

  await createAuditLog({
    actorUserId: adminUser.id,
    action: "REJECT_MARKET_OFFICER",
    entityType: "User",
    entityId: officer.userId,
    details: { officerName: officer.fullName, email: officer.user.email, reason },
  });

  await prisma.systemNotification.create({
    data: {
      userId: officer.userId,
      title: "Account Rejected",
      body: `Your Market Officer account has been rejected. Reason: ${reason}`,
      category: "Account",
      severity: "warning",
    },
  });

  return {
    userId: updatedUser.id,
    accountStatus: updatedUser.accountStatus,
    rejectionReason: updatedUser.rejectionReason,
  };
}

async function suspendMarketOfficer({ officerId, adminUser }) {
  const officer = await prisma.marketOfficerProfile.findUnique({
    where: { id: officerId },
    include: { user: true },
  });

  if (!officer) {
    throw new ApiError(404, "Market Officer not found.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: officer.userId },
    data: {
      accountStatus: "SUSPENDED",
    },
  });

  await createAuditLog({
    actorUserId: adminUser.id,
    action: "SUSPEND_MARKET_OFFICER",
    entityType: "User",
    entityId: officer.userId,
    details: { officerName: officer.fullName },
  });

  await prisma.systemNotification.create({
    data: {
      userId: officer.userId,
      title: "Account Suspended",
      body: "Your Market Officer account has been suspended. Contact the administrator.",
      category: "Account",
      severity: "error",
    },
  });

  return {
    userId: updatedUser.id,
    accountStatus: updatedUser.accountStatus,
  };
}

async function reactivateMarketOfficer({ officerId, adminUser }) {
  const officer = await prisma.marketOfficerProfile.findUnique({
    where: { id: officerId },
    include: { user: true },
  });

  if (!officer) {
    throw new ApiError(404, "Market Officer not found.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: officer.userId },
    data: {
      accountStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
      rejectionReason: null,
    },
  });

  await createAuditLog({
    actorUserId: adminUser.id,
    action: "REACTIVATE_MARKET_OFFICER",
    entityType: "User",
    entityId: officer.userId,
    details: { officerName: officer.fullName },
  });

  await prisma.systemNotification.create({
    data: {
      userId: officer.userId,
      title: "Account Reactivated",
      body: "Your Market Officer account has been reactivated. You can now log in and manage crop prices.",
      category: "Account",
      severity: "success",
    },
  });

  return {
    userId: updatedUser.id,
    accountStatus: updatedUser.accountStatus,
  };
}

module.exports = {
  listMarketOfficers,
  listPendingMarketOfficers,
  getMarketOfficerById,
  approveMarketOfficer,
  rejectMarketOfficer,
  suspendMarketOfficer,
  reactivateMarketOfficer,
};
