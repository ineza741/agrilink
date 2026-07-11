const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);
  res.status(201).json({
    success: true,
    message: "Farmer account registered successfully.",
    data: result,
  });
});

const registerMarketOfficer = asyncHandler(async (req, res) => {
  const result = await authService.register({ ...req.validated.body, role: "MarketOfficer" });
  if (result.pendingApproval) {
    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } else {
    res.status(201).json({
      success: true,
      message: "Market Officer account registered successfully.",
      data: result,
    });
  }
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  res.json({
    success: true,
    message: "Login successful.",
    data: result,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getAuthenticatedUser(req.user.id);
  res.json({
    success: true,
    data: user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.validated.body);
  res.json({
    success: true,
    message: "Profile updated successfully.",
    data: user,
  });
});

module.exports = {
  register,
  registerMarketOfficer,
  login,
  me,
  updateProfile,
};
