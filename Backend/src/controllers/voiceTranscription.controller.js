
const fs = require("fs/promises");

const {
  transcribeAudio,
} = require("../services/voiceTranscription.service");

const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/webm",
  "audio/opus",
  "audio/l16",
  "audio/alaw",
  "audio/mulaw",
]);

function getErrorStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.error?.code,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);

    if (
      Number.isInteger(parsed) &&
      parsed >= 100 &&
      parsed <= 599
    ) {
      return parsed;
    }
  }

  return null;
}

async function transcribeVoice(req, res) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message:
        "Please upload an audio file using the field name 'audio'.",
    });
  }

  try {
    // Validate file size.
    if (
      typeof file.size === "number" &&
      file.size > 10 * 1024 * 1024
    ) {
      return res.status(413).json({
        success: false,
        message: "Audio file must not exceed 10 MB.",
      });
    }

    // Validate the declared MIME type.
    const mimeType = file.mimetype?.toLowerCase();

    if (!mimeType || !ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported audio format. Upload a supported audio file.",
      });
    }

    if (!file.path) {
      return res.status(400).json({
        success: false,
        message: "The uploaded audio file is unavailable.",
      });
    }

    if (
      typeof file.size === "number" &&
      file.size === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "The uploaded audio file is empty.",
      });
    }

    const result = await transcribeAudio(
      file.path,
      mimeType
    );

    if (
      !result ||
      typeof result.transcript !== "string" ||
      !result.transcript.trim()
    ) {
      return res.status(502).json({
        success: false,
        message:
          "No speech could be transcribed. Please record again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Audio transcribed successfully.",
      data: {
        transcript: result.transcript.trim(),
        model: result.model,
      },
    });
  } catch (error) {
    const status = getErrorStatus(error);

    // Diagnostic logging only. Never log audio or transcript content.
    console.error("[VoiceTranscription] Request failed.", {
      status: status ?? "unknown",
      name: error?.name ?? "unknown",
      message: error?.message ?? "No error message",
      code: error?.code ?? "unknown",
      details: error?.details ?? error?.errorDetails ?? null,
    });

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "Transcription quota or rate limit reached. Please try again later.",
      });
    }

    if (status === 401 || status === 403) {
      return res.status(502).json({
        success: false,
        message:
          "The transcription provider rejected the request. Check your API key and access.",
      });
    }

    if (
      error?.message ===
      "GEMINI_API_KEY is missing from environment variables"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Voice transcription is not configured on the server.",
      });
    }

    if (
      error?.message ===
      "No speech could be transcribed from the audio"
    ) {
      return res.status(422).json({
        success: false,
        message:
          "No speech was detected. Please speak clearly and try again.",
      });
    }

    return res.status(502).json({
      success: false,
      message:
        "Audio transcription failed. Please try again.",
    });
  } finally {
    // Remove the temporary upload after success or failure.
    if (file.path) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error(
            "[VoiceTranscription] Temporary file cleanup failed.",
            {
              code: cleanupError.code ?? "unknown",
            }
          );
        }
      }
    }
  }
}

module.exports = {
  transcribeVoice,
};
