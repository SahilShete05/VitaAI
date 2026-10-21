const { z } = require("zod");

const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .nullable();

const createAssessmentSchema = z
  .object({
    symptoms: z
      .string()
      .trim()
      .min(1, "Please describe your symptoms")
      .max(5000, "Symptoms must be at most 5000 characters"),

    // Supports numeric severity ("1"–"10") and existing descriptive values.
    severity: z
      .string()
      .trim()
      .min(1, "Severity cannot be empty")
      .max(50, "Severity must be at most 50 characters")
      .refine(
        (value) => {
          const normalized = value.toLowerCase();
          const numeric = Number(value);

          return (
            !Number.isFinite(numeric) ||
            (Number.isInteger(numeric) && numeric >= 1 && numeric <= 10) ||
            ["mild", "moderate", "severe", "low", "medium", "high"].includes(
              normalized
            )
          );
        },
        "Severity must be 1–10 or a supported descriptive value"
      )
      .optional()
      .nullable(),

    riskLevel: optionalText(50, "Risk level"),
    aiSummary: optionalText(5000, "AI summary"),
    recommendations: optionalText(5000, "Recommendations"),

    familyMemberId: z
      .string()
      .uuid("Family member ID must be a valid UUID")
      .optional()
      .nullable(),
  })
  .strict();

module.exports = {
  createAssessmentSchema,
};