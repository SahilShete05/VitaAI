
const {
  chatWithHealthAssistant,
  detectEmergency,
} = require("../services/healthChat.service");

const {
  normalizeLanguage,
  isSupportedLanguage,
} = require("../utils/language");

const prisma = require("../config/prismaClient");

const EMERGENCY_MESSAGES = {
  en: "Your symptoms may indicate a medical emergency. In India, call 112 or go to the nearest emergency department now. Do not wait for an AI response. Ask someone nearby to help if possible.",
  hi: "आपके बताए लक्षण आपातकाल के संकेत हो सकते हैं। भारत में 112 पर कॉल करें या तुरंत नज़दीकी आपातकालीन विभाग जाएँ। AI के उत्तर की प्रतीक्षा न करें। यदि संभव हो, किसी व्यक्ति से सहायता लें।",
  mr: "तुम्ही सांगितलेली लक्षणे वैद्यकीय आपत्कालीन स्थितीची असू शकतात. भारतात 112 वर कॉल करा किंवा तातडीने जवळच्या आपत्कालीन विभागात जा. AI च्या उत्तराची वाट पाहू नका. शक्य असल्यास दुसऱ्या व्यक्तीची मदत घ्या.",
};

function isValidCoordinatePair(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getEmergencyResponse(language, locationWasProvided, privateMode) {
  const emergencyMessage =
    EMERGENCY_MESSAGES[language] || EMERGENCY_MESSAGES.en;

  return {
    success: true,
    emergency: true,
    reply: emergencyMessage,
    message: emergencyMessage,
    language,
    emergencyNumber: "112",
    emergencyCallLink: "tel:112",
    nearbyFacilities: [],
    hospitalsLoading: locationWasProvided,
    locationProvided: locationWasProvided,
    hospitalsEndpoint: locationWasProvided
      ? "/api/healthcare-locator/nearby"
      : null,
    privateMode,
    disclaimer:
      "Automated screening can miss emergencies. If you believe this is an emergency, seek immediate medical care regardless of this response.",
  };
}

async function sendHealthChatMessage(req, res) {
  try {
    const {
      message,
      history = [],
      language = "en",
      latitude,
      longitude,
    } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.trim().length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message is required and must not exceed 3000 characters.",
      });
    }

    if (!Array.isArray(history) || history.length > 10) {
      return res.status(400).json({
        success: false,
        message:
          "History must be an array with no more than 10 messages.",
      });
    }


    if (!isSupportedLanguage(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language. Use en, hi, or mr.",
      });
    }

    const normalizedLanguage = normalizeLanguage(language);

    const locationWasProvided =
      latitude !== undefined || longitude !== undefined;

    if (
      locationWasProvided &&
      !isValidCoordinatePair(latitude, longitude)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide valid numeric latitude and longitude together.",
      });
    }


    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { privateMode: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const privateMode = user.privateMode;

    const safeHistory = privateMode ? [] : history;

    if (detectEmergency(message.trim())) {
      return res.status(200).json(
        getEmergencyResponse(
          normalizedLanguage,
          locationWasProvided,
          privateMode
        )
      );
    }

    const result = await chatWithHealthAssistant({
      message: message.trim(),
      history: safeHistory,
      language: normalizedLanguage,
    });

    const reply =
      typeof result === "string" ? result : result?.reply;

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("Health assistant returned an empty reply");
    }


    if (
      typeof result === "object" &&
      result?.emergency === true
    ) {
      return res.status(200).json(
        getEmergencyResponse(
          normalizedLanguage,
          locationWasProvided,
          privateMode
        )
      );
    }

    return res.status(200).json({
      success: true,
      emergency: false,
      reply: reply.trim(),
      language: result?.language || normalizedLanguage,
      privateMode,
      disclaimer:
        "VitaAI provides general health information, not a medical diagnosis. Consult a qualified healthcare professional.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Unable to process your message right now. Please try again.",
    });
  }
}

module.exports = {
  sendHealthChatMessage,
};
