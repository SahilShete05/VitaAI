const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const {
  createSupportRequest,
  getSupportRequests,
} = require("../controllers/support.controller");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getSupportRequests);
router.post("/", createSupportRequest);

module.exports = router;
