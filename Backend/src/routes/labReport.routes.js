
// src/routes/labReport.routes.js

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  analyzeLabReport,
} = require("../controllers/labReport.controller");

router.use(authMiddleware);

router.post("/analyze", analyzeLabReport);

module.exports = router;
