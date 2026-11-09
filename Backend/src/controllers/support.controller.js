const prisma = require("../config/prismaClient");

const categories = new Set(["general", "account", "technical", "privacy"]);

async function createSupportRequest(req, res) {
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const category = typeof req.body?.category === "string" ? req.body.category : "general";

  if (subject.length < 3 || subject.length > 120) {
    return res.status(400).json({
      success: false,
      message: "Subject must be between 3 and 120 characters.",
    });
  }

  if (message.length < 10 || message.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Message must be between 10 and 5000 characters.",
    });
  }

  if (!categories.has(category)) {
    return res.status(400).json({
      success: false,
      message: "Please choose a valid support category.",
    });
  }

  try {
    const request = await prisma.supportRequest.create({
      data: {
        subject,
        message,
        category,
        userId: req.user.id,
      },
      select: {
        id: true,
        subject: true,
        message: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Your support request has been submitted.",
      data: request,
    });
  } catch (error) {
    console.error("Create support request failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to submit your support request.",
    });
  }
}

async function getSupportRequests(req, res) {
  try {
    const requests = await prisma.supportRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        message: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Get support requests failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your support requests.",
    });
  }
}

module.exports = {
  createSupportRequest,
  getSupportRequests,
};
