
const cron = require("node-cron");
const {
  markOverdueDoses,
} = require("./overdueDose.service");

const startOverdueDoseScheduler = () => {
  // Check every 5 minutes
  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        await markOverdueDoses();
      } catch (error) {
        console.error("Overdue dose scheduler failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  // Run once on startup too
  markOverdueDoses().catch((error) => {
    console.error("Initial overdue dose check failed:", error);
  });

  console.log("Overdue dose scheduler started");
};

module.exports = { startOverdueDoseScheduler };
