
const prisma = require("../config/prismaClient");

// Get notifications for the logged-in user.
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const [reminders, medicationDoses, unreadReminderCount] =
      await Promise.all([
        prisma.reminder.findMany({
          where: {
            userId,
            notificationReady: true,
            isCompleted: false,
          },
          orderBy: {
            notificationReadyAt: "desc",
          },
        }),

        prisma.medicationDose.findMany({
          where: {
            status: "pending",
            scheduledFor: { lte: now },
            medication: {
              userId,
              isActive: true,
            },
          },
          include: {
            medication: {
              select: {
                id: true,
                name: true,
                dosage: true,
                instructions: true,
              },
            },
          },
          orderBy: {
            scheduledFor: "desc",
          },
        }),

        prisma.reminder.count({
          where: {
            userId,
            notificationReady: true,
            notificationReadAt: null,
            isCompleted: false,
          },
        }),
      ]);

    const reminderNotifications = reminders.map((reminder) => ({
      ...reminder,
      type: "reminder",
    }));

    const medicationNotifications = medicationDoses.map((dose) => ({
      id: `medication:${dose.id}`,
      type: "medication",
      title: `Time to take ${dose.medication.name}`,
      description: `Dosage: ${dose.medication.dosage}`,
      scheduledAt: dose.scheduledFor,
      status: dose.status,
      medicationId: dose.medication.id,
      doseId: dose.id,
      instructions: dose.medication.instructions,
      notificationReadAt: dose.notificationReadAt,
    }));

    const data = [
      ...reminderNotifications,
      ...medicationNotifications,
    ].sort(
      (a, b) =>
        new Date(b.scheduledAt || b.notificationReadyAt) -
        new Date(a.scheduledAt || a.notificationReadyAt)
    );

    const unreadMedicationCount = medicationDoses.filter(
      (dose) => dose.notificationReadAt === null
    ).length;

    return res.status(200).json({
      success: true,
      count: data.length,
      unreadCount: unreadReminderCount + unreadMedicationCount,
      data,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

// Mark one notification as read.
const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const now = new Date();

    // Medication notification IDs use the format medication:<doseId>.
    if (notificationId.startsWith("medication:")) {
      const doseId = notificationId.slice("medication:".length);

      if (!doseId) {
        return res.status(400).json({
          success: false,
          message: "Invalid medication notification ID",
        });
      }

      const result = await prisma.medicationDose.updateMany({
        where: {
          id: doseId,
          status: "pending",
          scheduledFor: { lte: now },
          notificationReadAt: null,
          medication: {
            userId,
            isActive: true,
          },
        },
        data: {
          notificationReadAt: now,
        },
      });

      if (result.count > 0) {
        return res.status(200).json({
          success: true,
          message: "Medication notification marked as read",
        });
      }

      // Check whether this notification exists and belongs to the user.
      const existing = await prisma.medicationDose.findFirst({
        where: {
          id: doseId,
          status: "pending",
          scheduledFor: { lte: now },
          medication: {
            userId,
            isActive: true,
          },
        },
        select: {
          id: true,
          notificationReadAt: true,
        },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Notification already read",
      });
    }

    // Otherwise, handle a regular reminder notification.
    const result = await prisma.reminder.updateMany({
      where: {
        id: notificationId,
        userId,
        notificationReady: true,
        notificationReadAt: null,
      },
      data: {
        notificationReadAt: now,
      },
    });

    if (result.count > 0) {
      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    }

    const existing = await prisma.reminder.findFirst({
      where: {
        id: notificationId,
        userId,
        notificationReady: true,
      },
      select: {
        id: true,
        notificationReadAt: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification already read",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

// Mark all currently unread notifications as read.
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const [reminderResult, medicationResult] = await Promise.all([
      prisma.reminder.updateMany({
        where: {
          userId,
          notificationReady: true,
          notificationReadAt: null,
          isCompleted: false,
        },
        data: {
          notificationReadAt: now,
        },
      }),

      prisma.medicationDose.updateMany({
        where: {
          status: "pending",
          scheduledFor: { lte: now },
          notificationReadAt: null,
          medication: {
            userId,
            isActive: true,
          },
        },
        data: {
          notificationReadAt: now,
        },
      }),
    ]);

    const updatedCount =
      reminderResult.count + medicationResult.count;

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      updatedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
