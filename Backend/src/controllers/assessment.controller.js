
const prisma = require("../config/prismaClient");
const { analyzeSymptoms } = require("../services/assessment.service");

const createAssessment = async (req, res) => {
  try {
    const {
      symptoms,
      severity,
      riskLevel,
      aiSummary,
      recommendations,
      familyMemberId,
    } = req.body;

    if (typeof symptoms !== "string" || !symptoms.trim()) {
      return res.status(400).json({
        message: "Symptoms are required",
      });
    }

    if (
      severity !== undefined &&
      severity !== null &&
      typeof severity !== "string"
    ) {
      return res.status(400).json({
        message: "Severity must be a string",
      });
    }

    if (
      riskLevel !== undefined &&
      typeof riskLevel !== "string"
    ) {
      return res.status(400).json({
        message: "Risk level must be a string",
      });
    }

    // If this assessment is for a family member,
    // verify that the member belongs to the logged-in user.
    if (familyMemberId) {
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          id: familyMemberId,
          userId: req.user.id,
        },
      });

      if (!familyMember) {
        return res.status(404).json({
          message: "Family member not found",
        });
      }
    }

    const assessment = await prisma.assessment.create({
      data: {
        symptoms: symptoms.trim(),
        severity: severity ?? null,
        riskLevel: riskLevel ?? "unknown",
        aiSummary: aiSummary ?? null,
        recommendations: recommendations ?? null,
        familyMemberId: familyMemberId || null,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      message: "Health assessment created successfully",
      assessment,
    });
  } catch (error) {
    console.error("Create assessment error:", error);

    return res.status(500).json({
      message: "Failed to create health assessment",
    });
  }
};

const getAssessments = async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: assessments.length,
      assessments,
    });
  } catch (error) {
    console.error("Get assessments error:", error);

    return res.status(500).json({
      message: "Failed to retrieve health assessments",
    });
  }
};

const getAssessmentById = async (req, res) => {
  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        message: "Assessment not found",
      });
    }

    return res.status(200).json({ assessment });
  } catch (error) {
    console.error("Get assessment error:", error);

    return res.status(500).json({
      message: "Failed to retrieve health assessment",
    });
  }
};

const deleteAssessment = async (req, res) => {
  try {
    const result = await prisma.assessment.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message: "Assessment not found",
      });
    }

    return res.status(200).json({
      message: "Health assessment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assessment error:", error);

    return res.status(500).json({
      message: "Failed to delete health assessment",
    });
  }
};


const analyzeAssessment = async (req, res) => {
  const startedAt = Date.now();

  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    console.log(
      `[VitaAI] Database fetch: ${Date.now() - startedAt} ms`
    );

    if (!assessment) {
      return res.status(404).json({
        message: "Assessment not found",
      });
    }

    const aiStartedAt = Date.now();

    const aiText = await analyzeSymptoms(
      assessment.symptoms,
      assessment.severity
    );

    console.log(
      `[VitaAI] Gemini generation: ${Date.now() - aiStartedAt} ms`
    );

    const summaryMatch = aiText.match(
      /Summary:\s*([\s\S]*?)(?=\nRecommendations:|\nUrgency:|$)/i
    );

    const recommendationsMatch = aiText.match(
      /Recommendations:\s*([\s\S]*?)(?=\nUrgency:|$)/i
    );

    const urgencyMatch = aiText.match(
      /Urgency:\s*([\s\S]*)$/i
    );

    const aiSummary =
      summaryMatch?.[1]?.trim() || aiText;

    const recommendations = [
      recommendationsMatch?.[1]?.trim(),
      urgencyMatch?.[1]?.trim()
        ? `Urgency: ${urgencyMatch[1].trim()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const saveStartedAt = Date.now();

    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        aiSummary,
        recommendations:
          recommendations ||
          "Consult a qualified healthcare professional.",
      },
    });

    console.log(
      `[VitaAI] Database save: ${Date.now() - saveStartedAt} ms`
    );

    console.log(
      `[VitaAI] Total time: ${Date.now() - startedAt} ms`
    );

    return res.status(200).json({
      message: "Health assessment analyzed successfully",
      assessment: updatedAssessment,
      disclaimer:
        "AI-generated information is not a medical diagnosis.",
    });
  } catch (error) {
    console.error("Analyze assessment error:", error);

    return res.status(500).json({
      message: "Unable to analyze assessment at this time",
    });
  }
};


const getAssessmentHistory = async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (error) {
    console.error("Get assessment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessment history",
    });
  }
};


const getFilteredAssessmentHistory = async (req, res) => {
  try {
    const { from, to, familyMemberId } = req.query;

    const where = {
      userId: req.user.id,
    };

    if (from || to) {
      where.createdAt = {};

      if (from) {
        const fromDate = new Date(from);

        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "'from' must be a valid date",
          });
        }

        where.createdAt.gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "'to' must be a valid date",
          });
        }

        // If the client sends a date only (YYYY-MM-DD), include the full day.
        if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          toDate.setUTCHours(23, 59, 59, 999);
        }

        where.createdAt.lte = toDate;
      }

      if (
        where.createdAt.gte &&
        where.createdAt.lte &&
        where.createdAt.gte > where.createdAt.lte
      ) {
        return res.status(400).json({
          success: false,
          message: "'from' must be before or equal to 'to'",
        });
      }
    }

    if (familyMemberId) {
      const member = await prisma.familyMember.findFirst({
        where: {
          id: familyMemberId,
          userId: req.user.id,
        },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Family member not found",
        });
      }

      where.familyMemberId = familyMemberId;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (error) {
    console.error("Filtered assessment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch symptom history",
    });
  }
};

const getAssessmentTrends = async (req, res) => {
  try {
    const { from, to, familyMemberId } = req.query;

    const where = {
      userId: req.user.id,
    };

    if (from || to) {
      where.createdAt = {};

      if (from) {
        const fromDate = new Date(from);

        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "'from' must be a valid date",
          });
        }

        where.createdAt.gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "'to' must be a valid date",
          });
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          toDate.setUTCHours(23, 59, 59, 999);
        }

        where.createdAt.lte = toDate;
      }

      if (
        where.createdAt.gte &&
        where.createdAt.lte &&
        where.createdAt.gte > where.createdAt.lte
      ) {
        return res.status(400).json({
          success: false,
          message: "'from' must be before or equal to 'to'",
        });
      }
    }

    if (familyMemberId) {
      const member = await prisma.familyMember.findFirst({
        where: {
          id: familyMemberId,
          userId: req.user.id,
        },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Family member not found",
        });
      }

      where.familyMemberId = familyMemberId;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        symptoms: true,
        severity: true,
        riskLevel: true,
        createdAt: true,
        familyMemberId: true,
      },
    });

    // Only numeric severity values can be plotted on the 1–10 scale.
    const numericAssessments = assessments
      .map((item) => ({
        ...item,
        numericSeverity:
          item.severity !== null &&
          item.severity.trim() !== "" &&
          Number.isFinite(Number(item.severity)) &&
          Number.isInteger(Number(item.severity)) &&
          Number(item.severity) >= 1 &&
          Number(item.severity) <= 10
            ? Number(item.severity)
            : null,
      }));

    const byDay = new Map();

    for (const item of numericAssessments) {
      const day = item.createdAt.toISOString().slice(0, 10);

      if (!byDay.has(day)) {
        byDay.set(day, {
          date: day,
          records: 0,
          numericSeverityCount: 0,
          severityTotal: 0,
        });
      }

      const bucket = byDay.get(day);
      bucket.records += 1;

      if (item.numericSeverity !== null) {
        bucket.numericSeverityCount += 1;
        bucket.severityTotal += item.numericSeverity;
      }
    }

    const dailyTrends = Array.from(byDay.values()).map((day) => ({
      date: day.date,
      records: day.records,
      averageSeverity:
        day.numericSeverityCount > 0
          ? Number(
              (day.severityTotal / day.numericSeverityCount).toFixed(2)
            )
          : null,
    }));

    const numericValues = numericAssessments
      .map((item) => item.numericSeverity)
      .filter((value) => value !== null);

    const averageSeverity =
      numericValues.length > 0
        ? Number(
            (
              numericValues.reduce((sum, value) => sum + value, 0) /
              numericValues.length
            ).toFixed(2)
          )
        : null;

    return res.status(200).json({
      success: true,
      summary: {
        totalRecords: assessments.length,
        recordsWithNumericSeverity: numericValues.length,
        averageSeverity,
        latestRecordAt: assessments.at(-1)?.createdAt ?? null,
      },
      dailyTrends,
      disclaimer:
        "These summaries describe user-entered records and are not a medical diagnosis.",
    });
  } catch (error) {
    console.error("Assessment trends error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate symptom trends",
    });
  }
};


module.exports = {
  createAssessment,
  getAssessments,
  getAssessmentById,
  deleteAssessment,
  analyzeAssessment,
  getAssessmentHistory,
  getFilteredAssessmentHistory,
  getAssessmentTrends
};
