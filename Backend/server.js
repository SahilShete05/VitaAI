
require("dotenv").config();

const app = require("./src/app");
const {
  startReminderScheduler,
} = require("./src/services/reminderScheduler.service");
const {
  startOverdueDoseScheduler,
} = require("./src/services/overdueDoseScheduler.service");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`VitaAI server running on port ${PORT}`);

  startReminderScheduler();
  startOverdueDoseScheduler();
});
