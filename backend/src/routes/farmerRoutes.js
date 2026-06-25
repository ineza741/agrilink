const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  updateMyProfileSchema,
  farmerIdSchema,
  reviewSchema,
} = require("../validations/phase1Schemas");
const farmerController = require("../controllers/farmerController");

const router = express.Router();

router.use(authenticate);

router.get("/me", authorize("Farmer"), farmerController.getMyProfile);
router.put("/me", authorize("Farmer"), validate(updateMyProfileSchema), farmerController.updateMyProfile);

router.get("/", authorize("Admin", "ExtensionOfficer"), farmerController.listFarmers);
router.get("/:id", authorize("Admin", "ExtensionOfficer"), validate(farmerIdSchema), farmerController.getFarmerById);
router.put("/:id/approve", authorize("Admin", "ExtensionOfficer"), validate(reviewSchema), farmerController.approveFarmer);
router.put("/:id/reject", authorize("Admin", "ExtensionOfficer"), validate(reviewSchema), farmerController.rejectFarmer);
router.put("/:id/deactivate", authorize("Admin", "ExtensionOfficer"), validate(reviewSchema), farmerController.deactivateFarmer);
router.put("/:id/reactivate", authorize("Admin", "ExtensionOfficer"), validate(reviewSchema), farmerController.reactivateFarmer);

module.exports = router;
