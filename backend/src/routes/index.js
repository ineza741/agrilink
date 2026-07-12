const express = require("express");
const authRoutes = require("./authRoutes");
const farmerRoutes = require("./farmerRoutes");
const farmRoutes = require("./farmRoutes");
const cropHistoryRoutes = require("./cropHistoryRoutes");
const adminRoutes = require("./adminRoutes");
const soilRoutes = require("./soilRoutes");
const irrigationRoutes = require("./irrigationRoutes");
const marketRoutes = require("./marketRoutes");
const pestRoutes = require("./pestRoutes");
const recommendationRoutes = require("./recommendationRoutes");
const notificationRoutes = require("./notificationRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const weatherRoutes = require("./weatherRoutes");
const communityRoutes = require("./communityRoutes");
const cropPriceRoutes = require("./cropPriceRoutes");
const marketDirectoryRoutes = require("./marketDirectoryRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/farmers", farmerRoutes);
router.use("/farms", farmRoutes);
router.use("/", cropHistoryRoutes);
router.use("/", soilRoutes);
router.use("/irrigation", irrigationRoutes);
router.use("/market", marketRoutes);
router.use("/pests", pestRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/weather", weatherRoutes);
router.use("/community", communityRoutes);
router.use("/admin", adminRoutes);
router.use("/crop-prices", cropPriceRoutes);
router.use("/market-directory", marketDirectoryRoutes);

module.exports = router;
