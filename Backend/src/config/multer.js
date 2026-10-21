
const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");

const uploadDir = path.join(os.tmpdir(), "vitaai-audio");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      path.extname(file.originalname || "");

    cb(null, uniqueName);
  },
});

const allowedTypes = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/aiff",
  "audio/3gpp",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.has(file.mimetype.toLowerCase())) {
      return cb(
        new Error("Unsupported audio format.")
      );
    }

    cb(null, true);
  },
});

module.exports = upload;
