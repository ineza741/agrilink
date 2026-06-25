const prisma = require("../prisma/client");

function normalizeDetails(details) {
  if (!details) return undefined;

  const serialized = typeof details === "string" ? details : JSON.stringify(details);
  if (!serialized) return undefined;

  return serialized.length > 180 ? `${serialized.slice(0, 177)}...` : serialized;
}

async function createAuditLog({ actorUserId, action, entityType, entityId, details }) {
  return prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      details: normalizeDetails(details),
    },
  });
}

module.exports = {
  createAuditLog,
};
