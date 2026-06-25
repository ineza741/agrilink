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

module.exports = {
  register,
  login,
  me,
};
