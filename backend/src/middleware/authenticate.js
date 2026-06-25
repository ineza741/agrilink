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

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        farmerProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Account is inactive or does not exist.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
