const asyncHandler = require("../utils/asyncHandler");
const farmerService = require("../services/farmerService");

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await farmerService.getMyProfile(req.user);
  res.json({ success: true, data: profile });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await farmerService.updateMyProfile(req.user, req.validated.body);
  res.json({ success: true, message: "Farmer profile updated.", data: profile });
});

const listFarmers = asyncHandler(async (_req, res) => {
  const farmers = await farmerService.listFarmers();
  res.json({ success: true, data: farmers });
});

const getFarmerById = asyncHandler(async (req, res) => {
  const farmer = await farmerService.getFarmerById(req.validated.params.id);
  res.json({ success: true, data: farmer });
});

const approveFarmer = asyncHandler(async (req, res) => {
  const farmer = await farmerService.updateFarmerStatus({
    actorUser: req.user,
    farmerId: req.validated.params.id,
    verificationStatus: "Verified",
    isActive: true,
    reason: req.validated.body.reason,
    action: "APPROVE_FARMER",
  });
  res.json({ success: true, message: "Farmer approved.", data: farmer });
});

const rejectFarmer = asyncHandler(async (req, res) => {
  const farmer = await farmerService.updateFarmerStatus({
    actorUser: req.user,
    farmerId: req.validated.params.id,
    verificationStatus: "Rejected",
    isActive: false,
    reason: req.validated.body.reason || "Rejected during review.",
    action: "REJECT_FARMER",
  });
  res.json({ success: true, message: "Farmer rejected.", data: farmer });
});

const deactivateFarmer = asyncHandler(async (req, res) => {
  const farmer = await farmerService.updateFarmerStatus({
    actorUser: req.user,
    farmerId: req.validated.params.id,
    verificationStatus: "Deactivated",
    isActive: false,
    reason: req.validated.body.reason || "Farmer account deactivated.",
    action: "DEACTIVATE_FARMER",
  });
  res.json({ success: true, message: "Farmer deactivated.", data: farmer });
});

const reactivateFarmer = asyncHandler(async (req, res) => {
  const farmer = await farmerService.updateFarmerStatus({
    actorUser: req.user,
    farmerId: req.validated.params.id,
    verificationStatus: "Verified",
    isActive: true,
    reason: req.validated.body.reason || "Farmer account reactivated.",
    action: "REACTIVATE_FARMER",
  });
  res.json({ success: true, message: "Farmer reactivated.", data: farmer });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  listFarmers,
  getFarmerById,
  approveFarmer,
  rejectFarmer,
  deactivateFarmer,
  reactivateFarmer,
};
