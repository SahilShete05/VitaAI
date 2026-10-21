

const { normalizeLanguage } = require("../utils/language");

const FOLLOW_UP_QUESTIONS = {
  en: {
    duration: "How long have you had these symptoms?",
    severity: "How severe are your symptoms: mild, moderate, or severe?",
    fever: "Have you measured your temperature? If so, what was it?",
    breathing: "Are you experiencing difficulty breathing?",
    chestPain: "Are you experiencing chest pain or pressure?",
    other: "Are you experiencing any other symptoms?",
  },
  hi: {
    duration: "आपको ये लक्षण कब से हैं?",
    severity: "आपके लक्षण कितने गंभीर हैं: हल्के, मध्यम या गंभीर?",
    fever: "क्या आपने अपना तापमान मापा है? यदि हाँ, तो कितना?",
    breathing: "क्या आपको साँस लेने में परेशानी हो रही है?",
    chestPain: "क्या आपको सीने में दर्द या दबाव महसूस हो रहा है?",
    other: "क्या आपको कोई अन्य लक्षण भी हैं?",
  },
  mr: {
    duration: "तुम्हाला ही लक्षणे कधीपासून आहेत?",
    severity: "तुमची लक्षणे किती तीव्र आहेत: सौम्य, मध्यम की तीव्र?",
    fever: "तुम्ही तापमान मोजले आहे का? असल्यास, किती?",
    breathing: "तुम्हाला श्वास घेण्यास त्रास होत आहे का?",
    chestPain: "तुम्हाला छातीत दुखत आहे किंवा दाब जाणवत आहे का?",
    other: "तुम्हाला आणखी काही लक्षणे आहेत का?",
  },
};

function generateFollowUpQuestions(message, language = "en") {
  if (typeof message !== "string" || !message.trim()) {
    return [];
  }

  const lang = normalizeLanguage(language);
  const questions = FOLLOW_UP_QUESTIONS[lang] || FOLLOW_UP_QUESTIONS.en;
  const text = message.toLowerCase();
  const selected = [];

  // Do not delay emergency care with routine follow-up questions.
  const emergencyPatterns = [
    /chest pain|chest pressure|severe chest tightness/i,
    /difficulty breathing|trouble breathing|shortness of breath|can't breathe|cannot breathe/i,
    /unconscious|unresponsive|severe bleeding|overdose|poisoning/i,
    /सीने में दर्द|सांस नहीं आ रही|साँस नहीं आ रही|बेहोश|खुदकुशी|आत्महत्या/i,
    /छातीत दुखत|श्वास घेण्यास त्रास|बेशुद्ध|आत्महत्या/i,
  ];

  if (emergencyPatterns.some((pattern) => pattern.test(text))) {
    return [];
  }

  if (/fever|temperature|बुखार|ताप|तापमान/i.test(text)) {
    selected.push({
      key: "fever",
      question: questions.fever,
    });
  }

  if (/pain|ache|दर्द|दुखत|वेदना/i.test(text)) {
    selected.push({
      key: "severity",
      question: questions.severity,
    });
  }

  selected.push({
    key: "duration",
    question: questions.duration,
  });

  selected.push({
    key: "other",
    question: questions.other,
  });

  return selected.slice(0, 3);
}

module.exports = {
  generateFollowUpQuestions,
};
