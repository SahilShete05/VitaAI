
const SUPPORTED_LANGUAGES = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
  },
  hi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
  },
  mr: {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
  },
};

const LANGUAGE_ALIASES = {
  english: "en",
  en: "en",

  hindi: "hi",
  "हिन्दी": "hi",
  "हिंदी": "hi",
  hi: "hi",

  marathi: "mr",
  "मराठी": "mr",
  mr: "mr",
};

function isSupportedLanguage(language) {
  if (typeof language !== "string" || !language.trim()) {
    return false;
  }

  const normalized = language.trim().toLowerCase();

  return Object.prototype.hasOwnProperty.call(
    LANGUAGE_ALIASES,
    normalized
  );
}

function normalizeLanguage(language) {
  if (typeof language !== "string" || !language.trim()) {
    return "en";
  }

  const normalized = language.trim().toLowerCase();

  return LANGUAGE_ALIASES[normalized] || "en";
}

function getLanguageName(language) {
  const code = normalizeLanguage(language);
  return SUPPORTED_LANGUAGES[code].name;
}

function getNativeLanguageName(language) {
  const code = normalizeLanguage(language);
  return SUPPORTED_LANGUAGES[code].nativeName;
}

function getLanguageInstruction(language) {
  const languageName = getLanguageName(language);

  return `
LANGUAGE REQUIREMENTS:
- Respond primarily in ${languageName}.
- Use natural, clear language suitable for a non-medical reader.
- Preserve medicine names, medical abbreviations, measurements,
  and clinically important details accurately.
- Understand messages written in English, Hindi, Marathi,
  or a mixture of these languages.
- Do not switch languages unless the user requests it.
- Do not invent medical facts when translating or explaining symptoms.
- Ask for clarification when an important symptom description is unclear.
- Never present an uncertain translation as medically confirmed.
- Keep emergency warnings clear and unambiguous.
- Preserve the meaning of medical disclaimers.
`;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  isSupportedLanguage,
  getLanguageName,
  getNativeLanguageName,
  getLanguageInstruction,
};
