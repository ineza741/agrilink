const express = require("express");

const communityController = require("../controllers/communityController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  communityDashboardSchema,
  communityQuestionCreateSchema,
  communityQuestionAcceptSchema,
  communityEventRegisterSchema,
  communityPracticeSubmissionSchema,
} = require("../validations/phase10CommunitySchemas");

const router = express.Router();

router.use(authenticate);
router.use(authorize("Farmer", "Admin", "ExtensionOfficer"));

router.get("/dashboard", validate(communityDashboardSchema), communityController.getDashboard);
router.post("/questions", validate(communityQuestionCreateSchema), communityController.submitQuestion);
router.put("/questions/:id/accept", validate(communityQuestionAcceptSchema), communityController.acceptQuestion);
router.post("/events/:id/register", validate(communityEventRegisterSchema), communityController.registerEvent);
router.post("/practices/submissions", validate(communityPracticeSubmissionSchema), communityController.submitPractice);

module.exports = router;
