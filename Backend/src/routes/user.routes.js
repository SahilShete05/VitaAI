
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  getMyProfile,
  updateMyProfile
} = require("../controllers/user.controller");

router.use(authMiddleware);

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);

module.exports = router;
