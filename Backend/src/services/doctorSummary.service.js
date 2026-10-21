
const { normalizeLanguage } = require("../utils/language");

const SUMMARY_LABELS = {
  en: {
    title: "Doctor-Ready Health Summary",
    symptoms: "Reported symptoms",
    duration: "Duration",
    severity: "Severity",
    history: "Additional information",
    disclaimer:
      "Patient-reported information; not a medical diagnosis.",
    unknown: "Not provided",
  },
  hi: {
    title: "डॉक्टर के लिए स्वास्थ्य सारांश",
    symptoms: "बताए गए लक्षण",
    duration: "अवधि",
    severity: "गंभीरता",
    history: "अतिरिक्त जानकारी",
    disclaimer: "रोगी द्वारा दी गई जानकारी; यह चिकित्सा निदान नहीं है।",
    unknown: "जानकारी नहीं दी गई",
  },
  mr: {
    title: "डॉक्टरांसाठी आरोग्य सारांश",
    symptoms: "सांगितलेली लक्षणे",
    duration: "कालावधी",
    severity: "तीव्रता",
    history: "अतिरिक्त माहिती",
    disclaimer: "रुग्णाने दिलेली माहिती; हे वैद्यकीय निदान नाही.",
    unknown: "माहिती दिलेली नाही",
  },
};

function createDoctorSummary({
  symptoms,
  duration,
  severity,
  additionalInformation,
  language = "en",
}) {
  const lang = normalizeLanguage(language);
  const labels = SUMMARY_LABELS[lang] || SUMMARY_LABELS.en;

  const clean = (value) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, 1000)
      : labels.unknown;

  return {
    title: labels.title,
    language: lang,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        label: labels.symptoms,
        value: clean(symptoms),
      },
      {
        label: labels.duration,
        value: clean(duration),
      },
      {
        label: labels.severity,
        value: clean(severity),
      },
      {
        label: labels.history,
        value: clean(additionalInformation),
      },
    ],
    disclaimer: labels.disclaimer,
  };
}

module.exports = { createDoctorSummary };
