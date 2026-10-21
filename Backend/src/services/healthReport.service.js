
const prisma = require("../config/prismaClient");

// Convert saved severity values into a consistent 1–10 scale.
// Numeric values are retained; text labels are mapped explicitly.
function normalizeSeverity(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 1 && value <= 10
      ? value
      : null;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  const severityMap = {
    mild: 3,
    moderate: 5,
    medium: 5,
    severe: 8,
    critical: 10,
  };

  if (Object.prototype.hasOwnProperty.call(severityMap, normalized)) {
    return severityMap[normalized];
  }

  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) &&
    numericValue >= 1 &&
    numericValue <= 10
    ? numericValue
    : null;
}

async function generateHealthReport({
  userId,
  from,
  to,
  familyMemberId,
}) {
  const where = { userId };

  // Optional date filtering
  if (from || to) {
    where.createdAt = {};

    if (from) {
      const startDate = new Date(from);

      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Invalid from date.");
      }

      where.createdAt.gte = startDate;
    }

    if (to) {
      const endDate = new Date(to);

      if (Number.isNaN(endDate.getTime())) {
        throw new Error("Invalid to date.");
      }

      // Include the entire selected date for YYYY-MM-DD input.
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        endDate.setUTCHours(23, 59, 59, 999);
      }

      where.createdAt.lte = endDate;
    }

    if (
      where.createdAt.gte &&
      where.createdAt.lte &&
      where.createdAt.gte > where.createdAt.lte
    ) {
      throw new Error("The from date must be before the to date.");
    }
  }

  // Only include family members owned by this user.
  if (familyMemberId) {
    const member = await prisma.familyMember.findFirst({
      where: {
        id: familyMemberId,
        userId,
      },
      select: { id: true },
    });

    if (!member) {
      throw new Error("Family member not found.");
    }

    where.familyMemberId = familyMemberId;
  }

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      symptoms: true,
      severity: true,
      riskLevel: true,
      aiSummary: true,
      recommendations: true,
      createdAt: true,
      familyMemberId: true,
    },
  });

  const numericSeverities = assessments
    .map((item) => normalizeSeverity(item.severity))
    .filter((value) => value !== null);

  const averageSeverity =
    numericSeverities.length > 0
      ? Number(
          (
            numericSeverities.reduce((sum, value) => sum + value, 0) /
            numericSeverities.length
          ).toFixed(2)
        )
      : null;

  const riskDistribution = assessments.reduce((result, item) => {
    const risk = item.riskLevel || "unknown";
    result[risk] = (result[risk] || 0) + 1;
    return result;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    period: {
      from: from || null,
      to: to || null,
    },
    summary: {
      totalAssessments: assessments.length,
      recordsWithNumericSeverity: numericSeverities.length,
      averageSeverity,
      riskDistribution,
    },
    assessments,
    disclaimer:
      "This report summarizes recorded health information and is not a medical diagnosis. Consult a qualified healthcare professional for medical advice.",
  };
}

module.exports = { generateHealthReport };
