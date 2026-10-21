
const prisma = require("../config/prismaClient");

const TIME_ZONE = "Asia/Kolkata";
const UTC_OFFSET_MINUTES = 330;
const SCHEDULING_DAYS = 7;

function getLocalDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = Number(part.value);
    }
  }

  return {
    year: result.year,
    month: result.month,
    day: result.day,
  };
}

function dateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addCalendarDays(parts, amount) {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + amount)
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function localScheduleToUtc(dateParts, time) {
  const [hour, minute] = time.split(":").map(Number);

  return new Date(
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      hour,
      minute
    ) - UTC_OFFSET_MINUTES * 60 * 1000
  );
}

async function generateMedicationDoses(userId) {
  const now = new Date();
  const today = getLocalDateParts(now);
  const lastDay = addCalendarDays(today, SCHEDULING_DAYS - 1);
  const nowMs = now.getTime();

  // Use UTC boundaries derived from Indian calendar dates.
  const windowStart = localScheduleToUtc(today, "00:00");
  const windowEndExclusive = localScheduleToUtc(
    addCalendarDays(lastDay, 1),
    "00:00"
  );

  const medications = await prisma.medication.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lt: windowEndExclusive },
      OR: [
        { endDate: null },
        { endDate: { gte: windowStart } },
      ],
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      scheduleTimes: true,
    },
  });

  const dosesToCreate = [];

  for (const medication of medications) {
    const startKey = dateKey(
      getLocalDateParts(medication.startDate)
    );

    const endKey = medication.endDate
      ? dateKey(getLocalDateParts(medication.endDate))
      : null;

    for (let offset = 0; offset < SCHEDULING_DAYS; offset++) {
      const day = addCalendarDays(today, offset);
      const key = dateKey(day);

      if (key < startKey || (endKey && key > endKey)) {
        continue;
      }

      for (const time of medication.scheduleTimes) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          continue;
        }

        const scheduledFor = localScheduleToUtc(day, time);

        if (scheduledFor.getTime() < nowMs) {
          continue;
        }

        // Do not schedule doses beyond the medication's exact end date.
        if (
          medication.endDate &&
          scheduledFor.getTime() > medication.endDate.getTime()
        ) {
          continue;
        }

        dosesToCreate.push({
          medicationId: medication.id,
          scheduledFor,
          status: "pending",
        });
      }
    }
  }

  if (dosesToCreate.length === 0) {
    return {
      generated: 0,
      windowDays: SCHEDULING_DAYS,
      timeZone: TIME_ZONE,
      message: "No upcoming doses needed scheduling",
    };
  }

  const result = await prisma.medicationDose.createMany({
    data: dosesToCreate,
    skipDuplicates: true,
  });

  return {
    generated: result.count,
    windowDays: SCHEDULING_DAYS,
    timeZone: TIME_ZONE,
  };
}

module.exports = {
  generateMedicationDoses,
};
