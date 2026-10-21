
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { getNearbyHealthcare } = require("../controllers/healthcareLocator.controller");
const { healthcareLocatorSchema } = require("../validations/healthcareLocator.validation");

router.use(authMiddleware);

router.get(
  "/nearby",
  (req, res, next) => {
    const result = healthcareLocatorSchema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid healthcare locator parameters",
        errors: result.error.issues,
      });
    }

    req.validatedQuery = result.data;
    next();
  },
  getNearbyHealthcare
);

module.exports = router;

