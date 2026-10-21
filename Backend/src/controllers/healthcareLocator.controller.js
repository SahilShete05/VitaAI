const {
  findNearbyHealthcare,
} = require("../services/healthcareLocator.service");

async function getNearbyHealthcare(req, res, next) {
  try {
    const places = await findNearbyHealthcare(req.validatedQuery);

    return res.status(200).json({
      success: true,
      count: places.length,
      data: places,
    });
  } catch (error) {
    console.error("Healthcare locator error:", error.message);

    if (error.code === "HEALTHCARE_PROVIDER_UNAVAILABLE") {
      return res.status(502).json({
        success: false,
        code: error.code,
        message:
          "The healthcare map service is temporarily unavailable. Please try again shortly.",
        data: [],
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: [],
      });
    }

    return next(error);
  }
}

module.exports = { getNearbyHealthcare };