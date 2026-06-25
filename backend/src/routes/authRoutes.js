const express = require("express");
const authenticate = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const { loginSchema, registerSchema } = require("../validations/phase1Schemas");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);

module.exports = router;
