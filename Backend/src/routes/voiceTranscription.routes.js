
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const authMiddleware = require("../middleware/auth.middleware");
const {
  transcribeVoice,
} = require("../controllers/voiceTranscription.controller");

const router = express.Router();

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "temp"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp3",
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, "");

    callback(
      null,
      `voice-${Date.now()}-${require("crypto").randomUUID()}${extension}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "Unsupported audio format. Please upload a supported audio file."
      );

      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

router.use(authMiddleware);

router.post(
  "/transcribe",
  (req, res, next) => {
    upload.single("audio")(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            message:
              error.code === "LIMIT_FILE_SIZE"
                ? "Audio file must not exceed 10 MB."
                : error.message,
          });
        }

        if (error.statusCode === 400) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }

        return next(error);
      }

      next();
    });
  },
  transcribeVoice
);

module.exports = router;
