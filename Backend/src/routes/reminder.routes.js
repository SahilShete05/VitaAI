
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  markReminderCompleted
} = require("../controllers/reminder.controller");

router.use(authMiddleware);

router.post("/", createReminder);
router.get("/", getReminders);
router.get("/:id", getReminderById);
router.put("/:id", updateReminder);
router.delete("/:id", deleteReminder);
router.patch("/:id/complete", markReminderCompleted);

module.exports = router;