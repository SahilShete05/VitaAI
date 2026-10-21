
const prisma = require("../config/prismaClient");
const {
  generateMedicationDoses,
} = require("../services/medicationScheduler.service");
const VALID_DOSE_STATUSES = ["pending", "taken", "missed", "skipped"];


const createMedication = async (req, res) => {
  try {
    const {
      name,
      dosage,
      frequency,
      scheduleTimes,
      instructions,
      startDate,
      endDate,
    } = req.body;

    if (
      !name?.trim() ||
      !dosage?.trim() ||
      !frequency?.trim() ||
      !Array.isArray(scheduleTimes) ||
      scheduleTimes.length === 0 ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, dosage, frequency, scheduleTimes and startDate are required",
      });
    }

    if (
      scheduleTimes.some(
        (time) =>
          typeof time !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Schedule times must use HH:mm format, e.g. 09:00",
      });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (
      Number.isNaN(start.getTime()) ||
      (end && Number.isNaN(end.getTime())) ||
      (end && end < start)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate or endDate",
      });
    }

    const medication = await prisma.medication.create({
      data: {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        scheduleTimes: [...new Set(scheduleTimes)],
        instructions: instructions?.trim() || null,
        startDate: start,
        endDate: end,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Medication created successfully",
      data: medication,
    });
  } catch (error) {
    console.error("Create medication error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create medication",
    });
  }
};

const getMedications = async (req, res) => {
  try {
    const medications = await prisma.medication.findMany({
      where: { userId: req.user.id },
      include: {
        doses: {
          orderBy: { scheduledFor: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: medications });
  } catch (error) {
    console.error("Get medications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve medications",
    });
  }
};

const updateMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      dosage,
      frequency,
      scheduleTimes,
      instructions,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const existing = await prisma.medication.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Medication not found",
      });
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Name must be a non-empty string",
      });
    }

    if (
      dosage !== undefined &&
      (typeof dosage !== "string" || !dosage.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Dosage must be a non-empty string",
      });
    }

    if (
      scheduleTimes !== undefined &&
      (!Array.isArray(scheduleTimes) ||
        scheduleTimes.length === 0 ||
        scheduleTimes.some(
          (time) =>
            typeof time !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "scheduleTimes must contain valid HH:mm times",
      });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const start = startDate === undefined
      ? undefined
      : new Date(startDate);

    const end = endDate === undefined
      ? undefined
      : endDate === null || endDate === ""
        ? null
        : new Date(endDate);

    if (
      (start && Number.isNaN(start.getTime())) ||
      (end && Number.isNaN(end.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate or endDate",
      });
    }

    const finalStart = start ?? existing.startDate;
    const finalEnd = end === undefined ? existing.endDate : end;

    if (finalEnd && finalEnd < finalStart) {
      return res.status(400).json({
        success: false,
        message: "endDate cannot be before startDate",
      });
    }

    const data = {};

    if (name !== undefined) data.name = name.trim();
    if (dosage !== undefined) data.dosage = dosage.trim();
    if (frequency !== undefined) {
      if (typeof frequency !== "string" || !frequency.trim()) {
        return res.status(400).json({
          success: false,
          message: "Frequency must be a non-empty string",
        });
      }
      data.frequency = frequency.trim();
    }
    if (scheduleTimes !== undefined) {
      data.scheduleTimes = [...new Set(scheduleTimes)];
    }
    if (instructions !== undefined) {
      if (instructions !== null && typeof instructions !== "string") {
        return res.status(400).json({
          success: false,
          message: "Instructions must be a string or null",
        });
      }
      data.instructions = instructions?.trim() || null;
    }
    if (start !== undefined) data.startDate = start;
    if (end !== undefined) data.endDate = end;
    if (isActive !== undefined) data.isActive = isActive;

    const medication = await prisma.medication.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      message: "Medication updated successfully",
      data: medication,
    });
  } catch (error) {
    console.error("Update medication error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update medication",
    });
  }
};

const deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;

    const medication = await prisma.medication.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found",
      });
    }

    await prisma.medication.delete({ where: { id } });

    return res.json({
      success: true,
      message: "Medication and its dose history deleted",
    });
  } catch (error) {
    console.error("Delete medication error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete medication",
    });
  }
};

const recordDose = async (req, res) => {
  try {
    const { id: medicationId } = req.params;
    const { scheduledFor, status, takenAt, notes } = req.body;

    if (
      !scheduledFor ||
      !VALID_DOSE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "scheduledFor and a valid status are required",
      });
    }

    const scheduledDate = new Date(scheduledFor);

    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduledFor date",
      });
    }

    const medication = await prisma.medication.findFirst({
      where: {
        id: medicationId,
        userId: req.user.id,
      },
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: "Medication not found",
      });
    }

    const actualTakenAt =
      status === "taken"
        ? takenAt
          ? new Date(takenAt)
          : new Date()
        : null;

    if (
      actualTakenAt &&
      Number.isNaN(actualTakenAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid takenAt date",
      });
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string or null",
      });
    }

    const dose = await prisma.medicationDose.upsert({
      where: {
        medicationId_scheduledFor: {
          medicationId,
          scheduledFor: scheduledDate,
        },
      },
      create: {
        medicationId,
        scheduledFor: scheduledDate,
        status,
        takenAt: actualTakenAt,
        notes: notes?.trim() || null,
      },
      update: {
        status,
        takenAt: actualTakenAt,
        notes: notes?.trim() || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Dose record saved successfully",
      data: dose,
    });
  } catch (error) {
    console.error("Record medication dose error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record medication dose",
    });
  }
};


const generateScheduledDoses = async (req, res) => {
  try {
    const result = await generateMedicationDoses(req.user.id);

    return res.json({
      success: true,
      message: "Medication dose scheduling completed",
      data: result,
    });
  } catch (error) {
    console.error("Generate scheduled doses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate scheduled doses",
    });
  }
};


const updateDoseStatus = async (req, res) => {
  try {
    const { doseId } = req.params;
    const { status, takenAt, notes } = req.body;

    const validStatuses = ["taken", "skipped", "missed", "pending"];

    // Validate status
    if (
      typeof status !== "string" ||
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Status must be taken, skipped, missed, or pending",
      });
    }

    // Validate notes
    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string or null",
      });
    }

    // Validate takenAt
    let actualTakenAt = null;

    if (status === "taken") {
      actualTakenAt =
        takenAt === undefined || takenAt === null
          ? new Date()
          : new Date(takenAt);

      if (Number.isNaN(actualTakenAt.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid takenAt date",
        });
      }

      if (actualTakenAt > new Date()) {
        return res.status(400).json({
          success: false,
          message: "takenAt cannot be in the future",
        });
      }
    } else if (takenAt !== undefined && takenAt !== null) {
      return res.status(400).json({
        success: false,
        message: "takenAt is only allowed when status is taken",
      });
    }

    // Find dose belonging to the logged-in user
    const existingDose = await prisma.medicationDose.findFirst({
      where: {
        id: doseId,
        medication: {
          userId: req.user.id,
        },
      },
    });

    if (!existingDose) {
      return res.status(404).json({
        success: false,
        message: "Medication dose not found",
      });
    }

    const now = new Date();

    // Prevent marking future doses as taken or missed
    if (
      ["taken", "missed"].includes(status) &&
      existingDose.scheduledFor > now
    ) {
      return res.status(400).json({
        success: false,
        message: `A future-scheduled dose cannot be marked as ${status}`,
        scheduledFor: existingDose.scheduledFor,
      });
    }

    // Update the dose
    const dose = await prisma.medicationDose.update({
      where: {
        id: existingDose.id,
      },
      data: {
        status,
        takenAt: status === "taken" ? actualTakenAt : null,
        ...(notes !== undefined
          ? { notes: notes.trim() || null }
          : {}),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Dose marked as ${status}`,
      data: dose,
    });
  } catch (error) {
    console.error("Update dose status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update medication dose",
    });
  }
};



const getDoseHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, from, to } = req.query;

    const validStatuses = ["pending", "taken", "missed", "skipped"];

    // Validate status filter
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use pending, taken, missed, or skipped.",
      });
    }

    // Validate date filters
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (
      (fromDate && Number.isNaN(fromDate.getTime())) ||
      (toDate && Number.isNaN(toDate.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "'from' must be before or equal to 'to'.",
      });
    }

    const where = {
      medication: { userId },
      ...(status ? { status } : {}),
      ...(fromDate || toDate
        ? {
            scheduledFor: {
              ...(fromDate
                ? { gte: fromDate }
                : {}),
              ...(toDate
                ? {
                    lt: new Date(
                      Date.UTC(
                        toDate.getUTCFullYear(),
                        toDate.getUTCMonth(),
                        toDate.getUTCDate() + 1
                      )
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };

    const doses = await prisma.medicationDose.findMany({
      where,
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "desc",
      },
      take: 100,
    });

    return res.status(200).json({
      success: true,
      count: doses.length,
      data: doses,
    });
  } catch (error) {
    console.error("Get dose history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve medication dose history",
    });
  }
};



const getDoseSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const timeZone = "Asia/Kolkata";
    const requestedDate = req.query.date;

    const getLocalDate = (date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);

    const today = getLocalDate(new Date());
    const localDate = requestedDate || today;

    // Validate YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD.",
      });
    }

    const [year, month, day] = localDate.split("-").map(Number);

    // Convert India local midnight to UTC
    const start = new Date(
      Date.UTC(year, month - 1, day) - 330 * 60 * 1000
    );

    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    // Validate actual calendar date
    if (getLocalDate(start) !== localDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid calendar date.",
      });
    }

    // Do not allow summaries for future dates
    if (localDate > today) {
      return res.status(400).json({
        success: false,
        message: "Future dates are not available for adherence summaries.",
      });
    }

    const now = new Date();
    const cutoff = end < now ? end : now;

    // Count only doses whose scheduled time has arrived
    const doses = await prisma.medicationDose.findMany({
      where: {
        medication: { userId },
        scheduledFor: {
          gte: start,
          lt: cutoff,
        },
      },
      select: {
        status: true,
      },
    });

    const summary = {
      date: localDate,
      timeZone,
      totalScheduled: doses.length,
      taken: doses.filter((d) => d.status === "taken").length,
      missed: doses.filter((d) => d.status === "missed").length,
      skipped: doses.filter((d) => d.status === "skipped").length,
      pending: doses.filter((d) => d.status === "pending").length,
    };

    // No eligible doses means adherence is not yet measurable
    summary.adherencePercentage =
      summary.totalScheduled === 0
        ? null
        : Math.round(
            (summary.taken / summary.totalScheduled) * 100
          );

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get dose summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve medication dose summary.",
    });
  }
};


const getWeeklyDoseSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const timeZone = "Asia/Kolkata";

    const getLocalDate = (date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);

    // Convert India local midnight to UTC
    const localMidnightToUTC = (dateString) => {
      const [year, month, day] = dateString.split("-").map(Number);

      return new Date(
        Date.UTC(year, month - 1, day) - 330 * 60 * 1000
      );
    };

    const today = getLocalDate(new Date());
    const [year, month, day] = today.split("-").map(Number);

    // Build the date strings for the seven-day period
    const firstDay = new Date(
      Date.UTC(year, month - 1, day - 6)
    );

    const startDate = [
      firstDay.getUTCFullYear(),
      String(firstDay.getUTCMonth() + 1).padStart(2, "0"),
      String(firstDay.getUTCDate()).padStart(2, "0"),
    ].join("-");

    const tomorrow = new Date(
      Date.UTC(year, month - 1, day + 1)
    );

    const endDate = [
      tomorrow.getUTCFullYear(),
      String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
      String(tomorrow.getUTCDate()).padStart(2, "0"),
    ].join("-");

    const start = localMidnightToUTC(startDate);
    const end = localMidnightToUTC(endDate);

    const now = new Date();
    const cutoff = end < now ? end : now;

    // Exclude doses scheduled in the future
    const doses = await prisma.medicationDose.findMany({
      where: {
        medication: { userId },
        scheduledFor: {
          gte: start,
          lt: cutoff,
        },
      },
      select: {
        scheduledFor: true,
        status: true,
      },
    });

    // Initialize all seven days
    const dailySummaries = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(
        Date.UTC(year, month - 1, day - 6 + i)
      );

      const dateString = [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
      ].join("-");

      dailySummaries[dateString] = {
        date: dateString,
        totalScheduled: 0,
        taken: 0,
        missed: 0,
        skipped: 0,
        pending: 0,
        adherencePercentage: null,
      };
    }

    // Count eligible doses by their India-local scheduled date
    for (const dose of doses) {
      const dateString = getLocalDate(dose.scheduledFor);
      const summary = dailySummaries[dateString];

      if (!summary) continue;

      summary.totalScheduled++;

      if (
        ["taken", "missed", "skipped", "pending"].includes(
          dose.status
        )
      ) {
        summary[dose.status]++;
      }
    }

    // Calculate each day's adherence
    const days = Object.values(dailySummaries).map((summary) => {
      summary.adherencePercentage =
        summary.totalScheduled === 0
          ? null
          : Math.round(
              (summary.taken / summary.totalScheduled) * 100
            );

      return summary;
    });

    const totalScheduled = doses.length;
    const taken = doses.filter(
      (dose) => dose.status === "taken"
    ).length;
    const missed = doses.filter(
      (dose) => dose.status === "missed"
    ).length;
    const skipped = doses.filter(
      (dose) => dose.status === "skipped"
    ).length;
    const pending = doses.filter(
      (dose) => dose.status === "pending"
    ).length;

    const adherencePercentage =
      totalScheduled === 0
        ? null
        : Math.round((taken / totalScheduled) * 100);

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: startDate,
          to: today,
          timeZone,
        },
        totalScheduled,
        taken,
        missed,
        skipped,
        pending,
        adherencePercentage,
        days,
      },
    });
  } catch (error) {
    console.error("Get weekly dose summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve weekly medication summary.",
    });
  }
};



module.exports = {
  createMedication,
  getMedications,
  updateMedication,
  deleteMedication,
  recordDose,
  generateScheduledDoses,
  updateDoseStatus,
  getDoseHistory,
  getDoseSummary,
  getWeeklyDoseSummary,
};
