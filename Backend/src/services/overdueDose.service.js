
const prisma = require("../config/prismaClient");

const GRACE_PERIOD_MINUTES = 60;

const markOverdueDoses = async () => {
  try {
    const cutoff = new Date(
      Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000
    );

    const result = await prisma.medicationDose.updateMany({
      where: {
        status: "pending",
        scheduledFor: {
          lte: cutoff,
        },
        medication: {
          isActive: true,
        },
      },
      data: {
        status: "missed",
        takenAt: null,
      },
    });

    if (result.count > 0) {
      console.log(
        `Marked ${result.count} overdue medication dose(s) as missed.`
      );
    }

    return result.count;
  } catch (error) {
    console.error("Mark overdue doses error:", error);
    throw error;
  }
};

module.exports = { markOverdueDoses };
