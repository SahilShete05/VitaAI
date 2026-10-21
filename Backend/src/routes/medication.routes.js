
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  createMedication,
  getMedications,
  updateMedication,
  deleteMedication,
  recordDose,
  generateScheduledDoses,
  updateDoseStatus,
  getDoseHistory,
  getDoseSummary,
  getWeeklyDoseSummary,
} = require("../controllers/medication.controller");

router.use(authMiddleware);

router.post("/", createMedication);
router.get("/", getMedications);
router.patch("/:id", updateMedication);
router.delete("/:id", deleteMedication);
router.post("/:id/doses", recordDose);
router.post("/generate-doses", generateScheduledDoses);
router.patch("/doses/:doseId/status", updateDoseStatus);
router.get("/doses/history", getDoseHistory);
router.get("/doses/summary", getDoseSummary);
router.get("/doses/weekly-summary", getWeeklyDoseSummary);

module.exports = router;
