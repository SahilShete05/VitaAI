
// src/routes/followUp.routes.js

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  getFollowUpQuestions,
} = require("../controllers/followUp.controller");

router.use(authMiddleware);

router.post("/", getFollowUpQuestions);

module.exports = router;
