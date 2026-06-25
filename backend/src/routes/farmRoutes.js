const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { farmSchema, farmIdSchema, farmUpdateSchema } = require("../validations/phase1Schemas");
const farmController = require("../controllers/farmController");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("Farmer"), validate(farmSchema), farmController.createFarm);
router.get("/my", authorize("Farmer"), farmController.listMyFarms);
router.get("/", authorize("Admin", "ExtensionOfficer"), farmController.listFarms);
router.get("/:id", validate(farmIdSchema), farmController.getFarmById);
router.put("/:id", validate(farmUpdateSchema), farmController.updateFarm);
router.delete("/:id", validate(farmIdSchema), farmController.deleteFarm);

module.exports = router;
