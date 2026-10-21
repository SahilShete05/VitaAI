

const {
  generateFollowUpQuestions,
} = require("../services/followUp.service");

async function getFollowUpQuestions(req, res) {
  try {
    const { message, language = "en" } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A non-empty message of at most 3000 characters is required.",
      });
    }

    const questions = generateFollowUpQuestions(
      message,
      language
    );

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Follow-up questions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate follow-up questions.",
    });
  }
}

module.exports = {
  getFollowUpQuestions,
};
