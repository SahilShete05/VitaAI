
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getPrivacySettings,
  updatePrivacySettings,
} = require("../controllers/privacy.controller");

router.use(authMiddleware);

router.get("/", getPrivacySettings);
router.patch("/", updatePrivacySettings);

module.exports = router;
