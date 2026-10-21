
const {
  generateHealthReport,
} = require("../services/healthReport.service");

const {
  generateHealthReportPdf,
} = require("../services/healthReportPdf.service");

const {
  generateDetailedHealthAnalysis,
} = require("../services/healthReportAi.service");

async function getHealthReport(req, res) {
  try {
    const { from, to, familyMemberId } = req.query;

    // Generate the report from saved assessment records.
    const report = await generateHealthReport({
      userId: req.user.id,
      from,
      to,
      familyMemberId,
    });

    // Generate additional AI analysis using Gemini.
    const detailedAnalysis =
      await generateDetailedHealthAnalysis(
        report.assessments
      );

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        detailedAnalysis,
      },
    });
  } catch (error) {
    console.error("Health report error:", error);

    if (
      error.message.includes("Invalid") ||
      error.message.includes("must be before") ||
      error.message === "Family member not found."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to generate the health report.",
    });
  }
}

async function downloadHealthReportPdf(req, res) {
  try {
    const { from, to, familyMemberId } = req.query;

    const pdfBuffer = await generateHealthReportPdf({
      userId: req.user.id,
      from,
      to,
      familyMemberId,
    });

    const filename = `vitaai-health-report-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).end(pdfBuffer);
  } catch (error) {
    console.error("Health report PDF error:", error);

    if (
      error.message.includes("Invalid") ||
      error.message.includes("must be before") ||
      error.message === "Family member not found."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to generate the PDF health report.",
    });
  }
}

module.exports = {
  getHealthReport,
  downloadHealthReportPdf,
};
