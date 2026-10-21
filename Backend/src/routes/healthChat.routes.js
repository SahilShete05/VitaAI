
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const {
  healthChatSchema,
} = require("../validations/healthChat.validation");

const {
  sendHealthChatMessage,
} = require("../controllers/healthChat.controller");

router.use(authMiddleware);

router.post(
  "/message",
  validate(healthChatSchema),
  sendHealthChatMessage
);

module.exports = router;
