
const { GoogleGenAI } = require("@google/genai");

async function analyzeSymptoms(symptoms, severity) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    contents: `
Reported symptoms: ${symptoms}
Reported severity: ${severity || "Not provided"}

You are VitaAI, a health information assistant.

Provide general health information, not a diagnosis.
Do not prescribe medication or claim certainty.
Explain when professional medical evaluation is appropriate.
If symptoms may indicate an emergency, advise immediate
contact with local emergency services.

Return your response using these exact headings:
Summary:
Recommendations:
Urgency:

Keep the response concise, calm, and easy to understand.
`,
    config: {
      temperature: 0.2,
      maxOutputTokens: 200,
    },
  });

  const result = response.text?.trim();

  if (!result) {
    throw new Error("Gemini returned an empty response");
  }

  return result;
}

module.exports = { analyzeSymptoms };
