
const { GoogleGenAI } = require("@google/genai");

const {
  normalizeLanguage,
  getLanguageInstruction,
} = require("../utils/language");

const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

function getAIClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

async function getMedicineInformation({
  medicineName,
  question = "",
  language = "en",
}) {
  if (
    typeof medicineName !== "string" ||
    !medicineName.trim() ||
    medicineName.length > 150
  ) {
    throw new Error(
      "Medicine name is required and must not exceed 150 characters"
    );
  }

  if (
    typeof question !== "string" ||
    question.length > 1000
  ) {
    throw new Error(
      "Question must not exceed 1000 characters"
    );
  }

  const lang = normalizeLanguage(language);
  const ai = getAIClient();

  const prompt = `
You are VitaAI's medicine information assistant.

Provide general, educational information about the medicine
identified below.

Medicine: ${medicineName.trim()}
User's question: ${question.trim() || "Provide a general overview."}

Requirements:
- Explain common uses only when the medicine identity is sufficiently clear.
- Mention common side effects and important precautions when reliably known.
- Explain that brand names and formulations may differ by country.
- If the medicine name is ambiguous, ask the user to confirm the active ingredient and strength.
- Never invent ingredients, dosages, interactions, or contraindications.
- Do not prescribe a dose or tell the user to start, stop, or change treatment.
- Do not claim the medicine is safe for a particular person without clinical context.
- For pregnancy, children, allergies, chronic conditions, or drug interactions,
  advise checking with a qualified clinician or pharmacist.
- For suspected overdose or severe allergic symptoms, advise urgent medical help.
- Make it clear that the response is general information, not a prescription.

${getLanguageInstruction(lang)}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
    },
  });

  const information =
    typeof response.text === "string"
      ? response.text.trim()
      : "";

  if (!information) {
    throw new Error(
      "The AI returned an empty medicine explanation"
    );
  }

  const disclaimers = {
    en: "General medicine information only. Confirm medicine identity and personal precautions with a qualified doctor or pharmacist.",
    hi: "यह केवल दवाओं से संबंधित सामान्य जानकारी है। दवा की सही पहचान और व्यक्तिगत सावधानियों के लिए योग्य डॉक्टर या फार्मासिस्ट से सलाह लें।",
    mr: "ही केवळ औषधांविषयी सामान्य माहिती आहे. औषधाची योग्य ओळख आणि वैयक्तिक खबरदारी यासाठी पात्र डॉक्टर किंवा फार्मासिस्टचा सल्ला घ्या.",
  };

  return {
    medicineName: medicineName.trim(),
    language: lang,
    information,
    disclaimer: disclaimers[lang],
  };
}

module.exports = {
  getMedicineInformation,
};
