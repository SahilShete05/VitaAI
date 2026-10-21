
const cron = require("node-cron");
const prisma = require("../config/prismaClient");

let isRunning = false;

async function processDueReminders() {
  // Prevent overlapping runs within this server process.
  if (isRunning) return;

  isRunning = true;

  try {
    const now = new Date();

    // PostgreSQL performs the update atomically.
    // Only pending, incomplete reminders are marked ready.
    const result = await prisma.reminder.updateMany({
      where: {
        scheduledAt: { lte: now },
        isCompleted: false,
        notificationReady: false,
      },
      data: {
        notificationReady: true,
        notificationReadyAt: now,
      },
    });

    if (result.count > 0) {
      console.log(
        `VitaAI: ${result.count} reminder notification(s) ready`
      );
    }
  } catch (error) {
    console.error(
      "Reminder scheduler failed:",
      error.message
    );
  } finally {
    isRunning = false;
  }
}

function startReminderScheduler() {
  // Check immediately on startup, then every minute.
  processDueReminders();

  cron.schedule("* * * * *", processDueReminders);

  console.log("VitaAI reminder scheduler started");
}

module.exports = {
  startReminderScheduler,
  processDueReminders,
};
