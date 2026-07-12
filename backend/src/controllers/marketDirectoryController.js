const asyncHandler = require("../utils/asyncHandler");
const marketDirectoryService = require("../services/marketDirectoryService");

const getNearbyMarkets = asyncHandler(async (req, res) => {
  const { farmId, cropName, priceType } = req.query;

  if (!farmId) {
    return res.status(400).json({ success: false, message: "farmId is required." });
  }

  const result = await marketDirectoryService.getNearbyMarkets({
    farmId,
    cropName: cropName || "",
    priceType: priceType || "Wholesale",
  });

  res.json({ success: true, data: result });
});

const importMarkets = asyncHandler(async (req, res) => {
  const result = await marketDirectoryService.importMarketDirectory();
  res.json({ success: true, data: result });
});

module.exports = { getNearbyMarkets, importMarkets };
