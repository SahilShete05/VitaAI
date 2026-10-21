
const {
  explainLabReport,
} = require("../services/labReport.service");

async function analyzeLabReport(req, res) {
  try {
    const { reportText, language = "en" } = req.body || {};

    if (
      typeof reportText !== "string" ||
      !reportText.trim() ||
      reportText.length > 15000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Report text is required and must not exceed 15000 characters.",
      });
    }

    const result = await explainLabReport({
      reportText,
      language,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Lab report analysis error:", error.message);

    if (
      error.message.includes("required") ||
      error.message.includes("must not exceed")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to explain the lab report right now.",
    });
  }
}

module.exports = { analyzeLabReport };
