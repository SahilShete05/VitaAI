
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  getDashboard,
} = require("../controllers/dashboard.controller");

router.use(authMiddleware);

router.get("/", getDashboard);

module.exports = router;
