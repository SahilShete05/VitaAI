const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const {
  explainMedicine,
} = require("../controllers/medicineInfo.controller");

router.use(authMiddleware);

router.post("/explain", explainMedicine);

module.exports = router;
