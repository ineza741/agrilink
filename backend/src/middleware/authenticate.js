const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Authentication required.");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (jwtError) {
      throw new ApiError(401, "Invalid or expired token. Please log in again.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        farmerProfile: true,
        marketOfficerProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Account is inactive or does not exist.");
    }

    if (user.role === "MarketOfficer" && user.accountStatus !== "APPROVED") {
      throw new ApiError(403, "Your Market Officer account is not approved. Access denied.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
