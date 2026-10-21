
const prisma = require("../config/prismaClient");

async function getPrivacySettings(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { privateMode: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve privacy settings",
    });
  }
}

async function updatePrivacySettings(req, res) {
  try {
    const { privateMode } = req.body || {};

    if (typeof privateMode !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "privateMode must be a boolean",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { privateMode },
      select: { privateMode: true },
    });

    return res.status(200).json({
      success: true,
      message: "Privacy settings updated",
      data: user,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to update privacy settings",
    });
  }
}

module.exports = {
  getPrivacySettings,
  updatePrivacySettings,
};
