
const {
  getMedicineInformation,
} = require("../services/medicineInfo.service");

const {
  normalizeLanguage,
  isSupportedLanguage,
} = require("../utils/language");

async function explainMedicine(req, res) {
  try {
    const {
      medicineName,
      question = "",
      language = "en",
    } = req.body || {};

    // Validate medicine name.
    if (
      typeof medicineName !== "string" ||
      !medicineName.trim() ||
      medicineName.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Medicine name is required and must not exceed 150 characters.",
      });
    }

    // Validate the user's question.
    if (
      typeof question !== "string" ||
      question.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Question must be a string and must not exceed 1000 characters.",
      });
    }

    // Validate the requested language.
    if (!isSupportedLanguage(language)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported language. Use en, hi, or mr.",
      });
    }

    const normalizedLanguage = normalizeLanguage(language);

    const result = await getMedicineInformation({
      medicineName: medicineName.trim(),
      question: question.trim(),
      language: normalizedLanguage,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Do not expose internal errors or API credentials to the client.
    console.error(
      "Medicine information request failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve medicine information right now. Please try again.",
    });
  }
}

module.exports = {
  explainMedicine,
};
