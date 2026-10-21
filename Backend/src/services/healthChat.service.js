
const { GoogleGenAI } = require("@google/genai");

const {
  normalizeLanguage,
  getLanguageInstruction,
} = require("../utils/language");

const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const RESPONSE_LANGUAGES = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

function getAIClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

// Basic keyword screening only. This is not a validated medical
// emergency detector and cannot rule out an emergency.
const EMERGENCY_PATTERNS = [
  // Cardiac emergencies
  /\b(chest pain|chest pressure|severe chest tightness|heart attack|heart attack symptoms)\b/i,

  // Breathing emergencies
  /\b(difficulty breathing|trouble breathing|shortness of breath|can't breathe|cannot breathe|not breathing|gasping for air|choking)\b/i,

  // Stroke warning signs
  /\b(face drooping|sudden weakness|sudden numbness|trouble speaking|slurred speech|sudden confusion|stroke symptoms)\b/i,

  // Consciousness, seizures and bleeding
  /\b(unconscious|not responding|unresponsive|seizure|severe bleeding|bleeding won't stop|vomiting blood)\b/i,

  // Allergic reactions, poisoning and overdose
  /\b(severe allergic reaction|anaphylaxis|throat is closing|swollen tongue|overdose|poisoning|poisoned)\b/i,

  // Other critical warning signs
  /\b(sudden worst headache|sudden loss of vision|sudden vision loss|severe burns)\b/i,

  // Self-harm crisis
  /\b(suicidal|kill myself|want to die|going to hurt myself|self[- ]harm)\b/i,

  // Hindi
  /सीने में दर्द|सीने में दबाव|सांस नहीं आ रही|साँस नहीं आ रही|सांस लेने में बहुत परेशानी|बेहोश|होश नहीं है|दौरा पड़ रहा|बहुत खून बह रहा|जहर खा लिया|ज़हर खा लिया|खुदकुशी|आत्महत्या/i,

  // Marathi
  /छातीत दुखत|छातीत दाब|श्वास घेण्यास त्रास|श्वास घेता येत नाही|बेशुद्ध|शुद्धीवर नाही|झटके येत|खूप रक्तस्राव|विष घेतले|आत्महत्या/i,
];

const EMERGENCY_RESPONSE = {
  en: "Your symptoms may indicate a medical emergency. Please seek emergency medical care now. In India, call 112 for emergency assistance. Do not drive yourself if you feel seriously unwell. If possible, ask someone nearby to help.",

  hi: "आपके लक्षण किसी चिकित्सीय आपातकाल का संकेत हो सकते हैं। कृपया तुरंत आपातकालीन चिकित्सा सहायता लें। भारत में आपातकालीन सहायता के लिए 112 पर कॉल करें। यदि आप गंभीर रूप से अस्वस्थ हैं, तो स्वयं वाहन न चलाएँ। संभव हो तो पास के किसी व्यक्ति से मदद लें।",

  mr: "तुमची लक्षणे वैद्यकीय आपत्कालीन स्थितीचे संकेत असू शकतात. कृपया त्वरित वैद्यकीय मदत घ्या. भारतात आपत्कालीन मदतीसाठी 112 वर कॉल करा. तुम्हाला गंभीर अस्वस्थ वाटत असल्यास स्वतः वाहन चालवू नका. शक्य असल्यास जवळच्या व्यक्तीची मदत घ्या.",
};

function detectEmergency(text) {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }

  return EMERGENCY_PATTERNS.some((pattern) =>
    pattern.test(text)
  );
}

function normalizeChatHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        ["user", "assistant", "model"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
    )
    .slice(-10)
    .map((item) => ({
      role:
        item.role === "assistant" || item.role === "model"
          ? "model"
          : "user",
      parts: [{ text: item.content.trim() }],
    }));
}

async function chatWithHealthAssistant({
  message,
  history = [],
  language = "en",
}) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("A non-empty message is required");
  }

  const normalizedLanguage = normalizeLanguage(language);

  // Emergency screening happens before the Gemini request.
  if (detectEmergency(message)) {
    return {
      reply:
        EMERGENCY_RESPONSE[normalizedLanguage] ||
        EMERGENCY_RESPONSE.en,
      emergency: true,
      language: normalizedLanguage,
    };
  }

  const ai = getAIClient();

  const languageInstruction =
    getLanguageInstruction(normalizedLanguage);

  // Select the response language using the normalized language code.
  // Do not infer it by searching instruction text for a language name.
  const responseLanguage =
    RESPONSE_LANGUAGES[normalizedLanguage] || "English";

  const systemInstruction = `
You are VitaAI, a cautious health information assistant.

LANGUAGE REQUIREMENTS:
- You MUST respond in ${responseLanguage}.
- The selected language code is "${normalizedLanguage}".
- For "en", write the response in English.
- For "hi", write the response in Hindi using Devanagari script.
- For "mr", write the response in Marathi using Devanagari script.
- Do not default to Hindi when English or Marathi is selected.
- Do not switch languages just because the user uses a medical term
  or because conversation history contains another language.
- Follow the selected language for the complete answer, including
  follow-up questions, recommendations, and the disclaimer.
- Preserve medicine names, measurements, and medical abbreviations
  accurately.

${languageInstruction}

SAFETY:
- Provide general health information, not a confirmed diagnosis.
- Never claim certainty about a disease based on symptoms alone.
- Do not prescribe medication or invent a medication dose.
- Ask up to three relevant follow-up questions when important details
  are missing.
- Give practical, low-risk self-care advice when appropriate.
- Explain when the user should contact a qualified healthcare professional.
- If the user describes possible emergency symptoms, immediately recommend
  emergency medical care. Do not delay advice with questions.
- Keyword screening can miss emergencies and cannot rule one out.
- Do not claim to have checked medical records or the user's location.
- Do not assume the user's age or medical history.
- End with a brief reminder, written in ${responseLanguage}, that this is
  general health information and not a confirmed medical diagnosis.
`;

  const safeHistory = normalizeChatHistory(history);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      ...safeHistory,
      {
        role: "user",
        parts: [{ text: message.trim() }],
      },
    ],
    config: {
      systemInstruction,
      temperature: 0.3,
    },
  });

  const reply =
    typeof response.text === "string"
      ? response.text.trim()
      : "";

  if (!reply) {
    throw new Error("The AI service returned an empty response");
  }

  return {
    reply,
    emergency: false,
    language: normalizedLanguage,
  };
}

module.exports = {
  chatWithHealthAssistant,
  detectEmergency,
};
