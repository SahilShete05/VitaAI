
const fs = require("fs/promises");
const { GoogleGenAI } = require("@google/genai");

const MODEL =
  process.env.GEMINI_TRANSCRIPTION_MODEL ||
  "gemini-3.5-transcribe";

const MAX_UPLOAD_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

let genAI;

function getAIClient() {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error(
      "GEMINI_API_KEY is missing from environment variables"
    );
    error.statusCode = 500;
    throw error;
  }

  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return genAI;
}

function logError(stage, error) {
  console.error(`[VoiceTranscription] ${stage} failed`, {
    name: error?.name || "Error",
    message: error?.message || "Unknown error",
    code: error?.cause?.code || error?.code || "unknown",
    cause: error?.cause?.message || null,
    status: error?.status || error?.statusCode || null,
  });
}

function isRetryableNetworkError(error) {
  const code = error?.cause?.code || error?.code;

  return [
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_SOCKET",
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
  ].includes(code);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(ai, filePath, mimeType) {
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[VoiceTranscription] Upload attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS}.`
      );

      const uploadedFile = await ai.files.upload({
        file: filePath,
        config: {
          mime_type: mimeType,
        },
      });

      if (!uploadedFile?.uri) {
        throw new Error("Gemini upload returned no file URI");
      }

      console.log("[VoiceTranscription] Audio upload succeeded.");

      return uploadedFile;
    } catch (error) {
      logError(`Gemini file upload attempt ${attempt}`, error);

      if (
        !isRetryableNetworkError(error) ||
        attempt === MAX_UPLOAD_ATTEMPTS
      ) {
        throw error;
      }

      const delay =
        INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);

      console.warn(
        `[VoiceTranscription] Retrying upload in ${delay}ms.`
      );

      await wait(delay);
    }
  }

  throw new Error("Gemini audio upload failed after retries");
}

function extractTranscript(result) {
  if (
    typeof result?.output_text === "string" &&
    result.output_text.trim()
  ) {
    return result.output_text.trim();
  }

  const textParts = [];

  function collectText(value) {
    if (!value) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        collectText(item);
      }
      return;
    }

    if (typeof value !== "object") return;

    if (
      typeof value.text === "string" &&
      (value.type === "text" || value.type === "output_text")
    ) {
      textParts.push(value.text);
    }

    if (Array.isArray(value.content)) {
      collectText(value.content);
    }

    if (Array.isArray(value.steps)) {
      collectText(value.steps);
    }

    if (Array.isArray(value.output)) {
      collectText(value.output);
    }
  }

  collectText(result?.steps);

  if (textParts.length === 0) {
    collectText(result?.output);
  }

  return textParts.join("\n").trim();
}

async function transcribeAudio(filePath, mimeType) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("A valid audio file path is required");
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new Error("Audio MIME type is required");
  }

  const ai = getAIClient();

  let fileInfo;

  try {
    fileInfo = await fs.stat(filePath);
  } catch (error) {
    logError("Reading audio file", error);
    throw error;
  }

  if (!fileInfo.isFile() || fileInfo.size === 0) {
    throw new Error("The uploaded audio file is empty or invalid");
  }

  console.log("[VoiceTranscription] Uploading audio to Gemini.", {
    mimeType,
    audioSizeBytes: fileInfo.size,
  });

  // Upload audio, retrying transient network failures.
  const uploadedFile = await uploadWithRetry(
    ai,
    filePath,
    mimeType
  );

  // Request transcription.
  try {
    console.log(
      `[VoiceTranscription] Starting transcription with model ${MODEL}.`
    );

    const result = await ai.interactions.create({
      model: MODEL,
      input: [
        {
          type: "audio",
          uri: uploadedFile.uri,
          mime_type: uploadedFile.mimeType || mimeType,
        },
      ],
    });

    console.log("[VoiceTranscription] Interaction diagnostics:", {
      id: result?.id ?? null,
      status: result?.status ?? null,
      object: result?.object ?? null,
      model: result?.model ?? null,
      responseKeys: Object.keys(result || {}),
      hasOutputText: typeof result?.output_text === "string",
      outputTextLength: result?.output_text?.length ?? 0,
      stepsCount: Array.isArray(result?.steps)
        ? result.steps.length
        : null,
    });

    const transcript = extractTranscript(result);

    if (!transcript) {
      const error = new Error(
        `Gemini returned no transcript. Interaction status: ${
          result?.status || "unknown"
        }`
      );

      error.statusCode = 502;
      throw error;
    }

    console.log("[VoiceTranscription] Transcription succeeded.");

    return {
      transcript,
      model: MODEL,
    };
  } catch (error) {
    logError("Gemini transcription", error);
    throw error;
  }
}

module.exports = {
  transcribeAudio,
};
