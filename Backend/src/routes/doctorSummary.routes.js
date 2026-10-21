

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  generateDoctorSummary,
} = require("../controllers/doctorSummary.controller");

router.use(authMiddleware);

router.post("/", generateDoctorSummary);

module.exports = router;
