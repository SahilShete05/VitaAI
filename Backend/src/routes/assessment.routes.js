const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const {
  createAssessmentSchema,
} = require("../validations/assessment.validation");

const {
  createAssessment,
  getAssessments,
  getAssessmentById,
  deleteAssessment,
  analyzeAssessment,
  getFilteredAssessmentHistory,
  getAssessmentTrends,
} = require("../controllers/assessment.controller");

// Every assessment endpoint requires authentication.
router.use(authMiddleware);

router.post(
  "/",
  validate(createAssessmentSchema),
  createAssessment
);

router.get("/", getAssessments);

// Keep specific routes above /:id.
router.get("/history", getFilteredAssessmentHistory);
router.get("/trends", getAssessmentTrends);
router.post("/:id/analyze", analyzeAssessment);

router.get("/:id", getAssessmentById);
router.delete("/:id", deleteAssessment);

module.exports = router;