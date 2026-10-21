const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  getHealthReport,
  downloadHealthReportPdf
} = require("../controllers/healthReport.controller");

router.use(authMiddleware);

router.get("/", getHealthReport);
router.get("/pdf", downloadHealthReportPdf);

module.exports = router;
