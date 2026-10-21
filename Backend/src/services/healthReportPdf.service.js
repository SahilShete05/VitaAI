
const PDFDocument = require("pdfkit");

const {
  generateHealthReport,
} = require("./healthReport.service");

const {
  generateDetailedHealthAnalysis,
} = require("./healthReportAi.service");

async function generateHealthReportPdf(filters) {
  const report = await generateHealthReport(filters);

  const aiAnalysis = await generateDetailedHealthAnalysis(
    report.assessments
  );

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
        info: {
          Title: "VitaAI Detailed Health Report",
          Author: "VitaAI",
        },
      });

      const chunks = [];
      let settled = false;

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });

      doc.on("end", () => {
        if (!settled) {
          settled = true;
          resolve(Buffer.concat(chunks));
        }
      });

      const PAGE_BOTTOM = 740;

      function ensureSpace(required = 65) {
        if (doc.y + required > PAGE_BOTTOM) {
          doc.addPage();
        }
      }

      function heading(text, requiredSpace = 65) {
        ensureSpace(requiredSpace);

        doc.moveDown(0.5);

        doc
          .fillColor("#17365D")
          .font("Helvetica-Bold")
          .fontSize(15)
          .text(text, {
            paragraphGap: 4,
          });

        doc.moveDown(0.25);

        doc
          .fillColor("#222222")
          .font("Helvetica")
          .fontSize(10);
      }

      function paragraph(text) {
        if (typeof text !== "string" || !text.trim()) {
          return;
        }

        ensureSpace(35);

        doc
          .fillColor("#222222")
          .font("Helvetica")
          .fontSize(10)
          .text(text.trim(), {
            lineGap: 3,
            paragraphGap: 5,
          });
      }

      function bullet(text) {
        if (typeof text !== "string" || !text.trim()) {
          return;
        }

        ensureSpace(35);

        doc
          .fillColor("#222222")
          .font("Helvetica")
          .fontSize(10)
          .text(`• ${text.trim()}`, {
            indent: 10,
            lineGap: 3,
            paragraphGap: 5,
          });
      }

      // --------------------------------------------------
      // Cover heading and report metadata
      // --------------------------------------------------

      doc
        .fillColor("#17365D")
        .font("Helvetica-Bold")
        .fontSize(23)
        .text("VitaAI Health Report", {
          align: "center",
        });

      doc.moveDown(0.4);

      doc
        .fillColor("#555555")
        .font("Helvetica")
        .fontSize(9)
        .text(
          `Generated: ${new Date(
            report.generatedAt
          ).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}`,
          { align: "center" }
        );

      if (report.period.from || report.period.to) {
        doc.moveDown(0.4);

        paragraph(
          `Reporting period: ${
            report.period.from || "Beginning"
          } to ${report.period.to || "Present"}`
        );
      }


      heading("1. Health Overview");
      paragraph(aiAnalysis.overview);

      heading("2. Assessment Statistics");

      paragraph(
        `Total assessments: ${report.summary.totalAssessments}`
      );

      paragraph(
        `Average recorded numeric severity: ${
          report.summary.averageSeverity === null
            ? "Not available"
            : `${report.summary.averageSeverity}/10`
        }`
      );

      paragraph(
        `Records with numeric severity: ${report.summary.recordsWithNumericSeverity}`
      );

      paragraph("Recorded risk-level distribution:");

      for (const [risk, count] of Object.entries(
        report.summary.riskDistribution
      )) {
        bullet(`${risk}: ${count}`);
      }


      heading("3. Possible Explanations");

      paragraph(
        "These AI-generated explanations are possibilities, not confirmed causes or diagnoses."
      );

      if (
        !Array.isArray(aiAnalysis.possibleExplanations) ||
        aiAnalysis.possibleExplanations.length === 0
      ) {
        paragraph(
          "There is insufficient information to list possible explanations."
        );
      } else {
        for (const item of aiAnalysis.possibleExplanations) {
          if (typeof item === "string") {
            bullet(item);
            continue;
          }

          if (!item || typeof item !== "object") {
            continue;
          }

          if (item.possibility) {
            ensureSpace(45);

            doc
              .fillColor("#222222")
              .font("Helvetica-Bold")
              .fontSize(10)
              .text(item.possibility);

            doc.font("Helvetica");
          }

          if (item.reasoning) {
            paragraph(`Reported information: ${item.reasoning}`);
          }

          if (item.limitations) {
            paragraph(`What remains unknown: ${item.limitations}`);
          }

          doc.moveDown(0.25);
        }
      }

      heading("4. Recommendations");

      if (
        Array.isArray(aiAnalysis.recommendations) &&
        aiAnalysis.recommendations.length
      ) {
        for (const item of aiAnalysis.recommendations) {
          bullet(item);
        }
      } else {
        paragraph("No recommendations were generated.");
      }

      heading("5. Warning Signs and When to Seek Help");

      if (
        Array.isArray(aiAnalysis.warningSigns) &&
        aiAnalysis.warningSigns.length
      ) {
        for (const item of aiAnalysis.warningSigns) {
          bullet(item);
        }
      } else {
        paragraph(
          "Seek professional medical advice if symptoms persist or worsen. Seek emergency help for severe or rapidly worsening symptoms."
        );
      }
      heading("6. Questions for Your Doctor");

      if (
        Array.isArray(aiAnalysis.questionsForDoctor) &&
        aiAnalysis.questionsForDoctor.length
      ) {
        for (const item of aiAnalysis.questionsForDoctor) {
          bullet(item);
        }
      } else {
        paragraph(
          "Discuss your symptoms, their duration, severity, and any changes with your healthcare professional."
        );
      }

      heading("7. Assessment History");

      if (report.assessments.length === 0) {
        paragraph("No assessments were recorded for this report.");
      }

      for (const [index, item] of report.assessments.entries()) {

        ensureSpace(115);

        heading(
          `Assessment ${index + 1} — ${new Date(
            item.createdAt
          ).toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}`,
          100
        );

        paragraph(`Symptoms: ${item.symptoms}`);

        paragraph(
          `Reported severity: ${item.severity || "Not provided"}`
        );

        paragraph(
          `Recorded risk level: ${item.riskLevel || "unknown"}`
        );

        if (item.aiSummary) {
          paragraph(`Previous AI summary: ${item.aiSummary}`);
        }

        if (item.recommendations) {
          paragraph(
            `Previously recorded recommendations: ${item.recommendations}`
          );
        }

        doc.moveDown(0.3);
      }

      heading("Important Medical Disclaimer");

      paragraph(
        aiAnalysis.disclaimer || report.disclaimer
      );

      paragraph(
        "This report is based on information recorded in VitaAI. Missing information may change the interpretation. Do not use this report to self-diagnose, delay emergency care, or replace advice from a qualified healthcare professional."
      );

      const range = doc.bufferedPageRange();

      for (
        let pageIndex = range.start;
        pageIndex < range.start + range.count;
        pageIndex++
      ) {
        doc.switchToPage(pageIndex);

        const footerY = doc.page.height - 35;

        doc
          .save()
          .strokeColor("#D5DCE5")
          .lineWidth(0.5)
          .moveTo(50, footerY - 8)
          .lineTo(doc.page.width - 50, footerY - 8)
          .stroke()
          .restore();

        doc
          .fillColor("#666666")
          .font("Helvetica")
          .fontSize(8)
          .text(
            "VitaAI | Health information, not a medical diagnosis",
            50,
            footerY,
            {
              width: 350,
              lineBreak: false,
            }
          );

        doc.text(
          `Page ${pageIndex + 1} of ${range.count}`,
          doc.page.width - 125,
          footerY,
          {
            width: 75,
            align: "right",
            lineBreak: false,
          }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateHealthReportPdf };