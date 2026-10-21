

const { GoogleGenAI } = require("@google/genai");
const { normalizeLanguage, getLanguageInstruction } =
  require("../utils/language");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

async function explainLabReport({ reportText, language = "en" }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (
    typeof reportText !== "string" ||
    !reportText.trim() ||
    reportText.length > 15000
  ) {
    throw new Error(
      "Report text is required and must not exceed 15000 characters"
    );
  }

  const lang = normalizeLanguage(language);

  const prompt = `
Explain the following laboratory report in accessible language.

Requirements:
- Explain what each provided test generally measures.
- Preserve the reported values, units, and laboratory reference ranges.
- Identify results marked high or low by the report, when those flags are provided.
- Do not invent values, reference ranges, diagnoses, or missing information.
- Explain that reference ranges vary by laboratory and patient context.
- Mention that a clinician must interpret results alongside symptoms and medical history.
- Do not recommend starting, stopping, or changing medication.
- If a result may indicate an urgent problem, advise contacting a healthcare professional promptly.
- Clearly state that this is educational information, not a diagnosis.

${getLanguageInstruction(lang)}

LAB REPORT TEXT:
${reportText.trim()}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
    },
  });

  const explanation = response.text;

  if (!explanation || !explanation.trim()) {
    throw new Error("The AI returned an empty lab report explanation");
  }

  return {
    language: lang,
    explanation: explanation.trim(),
    disclaimer:
      "Educational information only. A qualified healthcare professional should interpret your results.",
  };
}

module.exports = { explainLabReport };
