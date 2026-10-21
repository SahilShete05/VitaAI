
const {
  createDoctorSummary,
} = require("../services/doctorSummary.service");

async function generateDoctorSummary(req, res) {
  try {
    const {
      symptoms,
      duration,
      severity,
      additionalInformation,
      language = "en",
    } = req.body || {};

    if (
      typeof symptoms !== "string" ||
      !symptoms.trim() ||
      symptoms.length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Symptoms are required and must not exceed 3000 characters.",
      });
    }

    if (
      !["en", "hi", "mr", "English", "Hindi", "Marathi"].includes(
        language
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language.",
      });
    }

    const summary = createDoctorSummary({
      symptoms,
      duration,
      severity,
      additionalInformation,
      language,
    });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Doctor summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate the doctor summary.",
    });
  }
}

module.exports = { generateDoctorSummary };
