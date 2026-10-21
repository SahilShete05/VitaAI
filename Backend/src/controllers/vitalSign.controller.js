
const prisma = require("../config/prismaClient");

const VALID_TYPES = {
  blood_pressure: ["mmHg"],
  blood_glucose: ["mg/dL", "mmol/L"],
  heart_rate: ["bpm"],
  temperature: ["°C", "°F"],
  weight: ["kg", "lb"],
  spo2: ["%"],
};

const createVitalSign = async (req, res) => {
  try {
    const {
      type,
      value,
      secondaryValue,
      unit,
      recordedAt,
      notes,
    } = req.body;

    if (!Object.prototype.hasOwnProperty.call(VALID_TYPES, type)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported vital sign type",
        allowedTypes: Object.keys(VALID_TYPES),
      });
    }

    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      (secondaryValue !== undefined &&
        secondaryValue !== null &&
        (typeof secondaryValue !== "number" ||
          !Number.isFinite(secondaryValue)))
    ) {
      return res.status(400).json({
        success: false,
        message: "value and secondaryValue must be valid numbers",
      });
    }

    if (!VALID_TYPES[type].includes(unit)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit for this vital sign type",
        allowedUnits: VALID_TYPES[type],
      });
    }

    if (
      type === "blood_pressure" &&
      (typeof secondaryValue !== "number" ||
        secondaryValue <= 0 ||
        value <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Blood pressure requires positive systolic value and diastolic secondaryValue",
      });
    }

    if (
      type !== "blood_pressure" &&
      secondaryValue !== undefined &&
      secondaryValue !== null
    ) {
      return res.status(400).json({
        success: false,
        message: "secondaryValue is only used for blood pressure",
      });
    }

    if (value <= 0) {
      return res.status(400).json({
        success: false,
        message: "value must be greater than zero",
      });
    }

    if (notes !== undefined && notes !== null &&
        typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "notes must be a string or null",
      });
    }

    const date = recordedAt === undefined
      ? new Date()
      : new Date(recordedAt);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid recordedAt date",
      });
    }

    const vitalSign = await prisma.vitalSign.create({
      data: {
        type,
        value,
        secondaryValue: secondaryValue ?? null,
        unit,
        recordedAt: date,
        notes: notes?.trim() || null,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vital sign recorded successfully",
      data: vitalSign,
    });
  } catch (error) {
    console.error("Create vital sign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record vital sign",
    });
  }
};

const getVitalSigns = async (req, res) => {
  try {
    const { type, from, to, limit = "50" } = req.query;

    if (type && !Object.prototype.hasOwnProperty.call(VALID_TYPES, type)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported vital sign type",
      });
    }

    const parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "limit must be an integer between 1 and 100",
      });
    }

    const recordedAt = {};

    if (from) {
      recordedAt.gte = new Date(from);
      if (Number.isNaN(recordedAt.gte.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from date",
        });
      }
    }

    if (to) {
      recordedAt.lte = new Date(to);
      if (Number.isNaN(recordedAt.lte.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid to date",
        });
      }
    }

    if (
      recordedAt.gte &&
      recordedAt.lte &&
      recordedAt.gte > recordedAt.lte
    ) {
      return res.status(400).json({
        success: false,
        message: "from must be earlier than or equal to to",
      });
    }

    const vitals = await prisma.vitalSign.findMany({
      where: {
        userId: req.user.id,
        ...(type ? { type } : {}),
        ...(from || to ? { recordedAt } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: parsedLimit,
    });

    return res.json({
      success: true,
      count: vitals.length,
      data: vitals,
    });
  } catch (error) {
    console.error("Get vital signs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve vital signs",
    });
  }
};

const deleteVitalSign = async (req, res) => {
  try {
    const { id } = req.params;

    const vital = await prisma.vitalSign.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!vital) {
      return res.status(404).json({
        success: false,
        message: "Vital sign not found",
      });
    }

    await prisma.vitalSign.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Vital sign deleted successfully",
    });
  } catch (error) {
    console.error("Delete vital sign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete vital sign",
    });
  }
};

const getVitalSignSummary = async (req, res) => {
  try {
    const types = Object.keys(VALID_TYPES);

    const results = await Promise.all(
      types.map(async (type) => {
        const readings = await prisma.vitalSign.findMany({
          where: {
            userId: req.user.id,
            type,
          },
          orderBy: {
            recordedAt: "desc",
          },
          take: 2,
        });

        if (readings.length === 0) {
          return {
            type,
            latest: null,
            previous: null,
            change: null,
          };
        }

        const latest = readings[0];
        const previous = readings[1];

        return {
          type,
          latest,
          previous: previous || null,
          change: previous
            ? {
                value: latest.value - previous.value,
                secondaryValue:
                  latest.secondaryValue !== null &&
                  previous.secondaryValue !== null
                    ? latest.secondaryValue - previous.secondaryValue
                    : null,
                unit: latest.unit,
              }
            : null,
        };
      })
    );

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Vital sign summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate vital sign summary",
    });
  }
};


module.exports = {
  createVitalSign,
  getVitalSigns,
  deleteVitalSign,
  getVitalSignSummary,
};
