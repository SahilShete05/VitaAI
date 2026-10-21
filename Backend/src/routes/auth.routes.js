
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const {
  registerSchema,
  loginSchema,
} = require("../validations/auth.validation");

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/logout", logout);

router.get("/me", authMiddleware, getMe);

module.exports = router;
