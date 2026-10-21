
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createVitalSign,
  getVitalSigns,
  deleteVitalSign,
  getVitalSignSummary
} = require("../controllers/vitalSign.controller");

router.use(authMiddleware);

router.post("/", createVitalSign);
router.get("/", getVitalSigns);
router.get("/summary", getVitalSignSummary);
router.delete("/:id", deleteVitalSign);


module.exports = router;
