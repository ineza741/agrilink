const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const marketDirectoryController = require("../controllers/marketDirectoryController");

router.get("/nearby", authenticate, marketDirectoryController.getNearbyMarkets);

router.post("/import", authenticate, marketDirectoryController.importMarkets);

module.exports = router;
