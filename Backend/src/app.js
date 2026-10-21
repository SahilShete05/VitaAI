
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// CORS configuration

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);


// Middleware
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "VitaAI API is running",
  });
});

// API routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/assessments", require("./routes/assessment.routes"));
app.use("/api/family-members", require("./routes/familyMember.routes"));
app.use("/api/reminders", require("./routes/reminder.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/health-chat", require("./routes/healthChat.routes"));
app.use("/api/healthcare-locator", require("./routes/healthcareLocator.routes"));
app.use("/api/voice", require("./routes/voiceTranscription.routes"));
app.use("/api/follow-up", require("./routes/followUp.routes"));
app.use("/api/doctor-summary", require("./routes/doctorSummary.routes"));
app.use("/api/lab-reports", require("./routes/labReport.routes"));
app.use("/api/medicine-info",require("./routes/medicineInfo.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/health-report", require("./routes/healthReport.routes"));
app.use("/api/privacy", require("./routes/privacy.routes"));
app.use("/api/medications", require("./routes/medication.routes"));
app.use("/api/vitals", require("./routes/vitalSign.routes"));


// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
