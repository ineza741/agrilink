require("dotenv").config();

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  demoMode: (process.env.DEMO_MODE || "true").toLowerCase() === "true",
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173", "http://localhost:5174"],
  jwtSecret: process.env.JWT_SECRET || "super-secure-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  databaseUrl: process.env.DATABASE_URL,
};

module.exports = env;
