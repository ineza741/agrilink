const asyncHandler = require("../utils/asyncHandler");
const communityService = require("../services/communityService");

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await communityService.getDashboard(req.user);
  res.json({
    success: true,
    data: dashboard,
  });
});

const submitQuestion = asyncHandler(async (req, res) => {
  const result = await communityService.submitQuestion(req.user, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Community question submitted successfully.",
    data: result,
  });
});

const acceptQuestion = asyncHandler(async (req, res) => {
  const result = await communityService.acceptQuestion(req.user, req.validated.params.id);
  res.json({
    success: true,
    message: "Community answer marked as accepted.",
    data: result,
  });
});

const registerEvent = asyncHandler(async (req, res) => {
  const result = await communityService.registerEvent(req.user, req.validated.params.id);
  res.status(201).json({
    success: true,
    message: "Community event registration saved successfully.",
    data: result,
  });
});

const submitPractice = asyncHandler(async (req, res) => {
  const result = await communityService.submitPractice(req.user, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Community practice submitted successfully.",
    data: result,
  });
});

module.exports = {
  getDashboard,
  submitQuestion,
  acceptQuestion,
  registerEvent,
  submitPractice,
};
