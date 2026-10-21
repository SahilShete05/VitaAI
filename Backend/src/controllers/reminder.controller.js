const prisma = require("../config/prismaClient");

// Create a reminder
const createReminder = async (req, res) => {
  try {
    const { title, description,  scheduledAt } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reminder title is required",
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "Reminder time is required",
      });
    }

    const parsedTime = new Date(scheduledAt);

    if (Number.isNaN(parsedTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid reminder time",
      });
    }

    const reminder = await prisma.reminder.create({
      data: {
        title: title.trim(),
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
         scheduledAt : parsedTime,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Reminder created successfully",
      data: reminder,
    });
  } catch (error) {
    console.error("Create reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create reminder",
    });
  }
};

// Get all reminders for the logged-in user
const getReminders = async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.user.id },
      orderBy: { scheduledAt : "asc" },
    });

    return res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    console.error("Get reminders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reminders",
    });
  }
};

// Get one reminder
const getReminderById = async (req, res) => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error("Get reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reminder",
    });
  }
};

// Update a reminder

const updateReminder = async (req, res) => {
  try {
    const { title, description, scheduledAt } = req.body;

    const existing = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
    }

    const data = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }

      data.title = title.trim();
    }

    if (description !== undefined) {
      if (
        description !== null &&
        typeof description !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Description must be a string or null",
        });
      }

      data.description =
        typeof description === "string" && description.trim()
          ? description.trim()
          : null;
    }

    if (scheduledAt !== undefined) {
      const parsedTime = new Date(scheduledAt);

      if (Number.isNaN(parsedTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid reminder time",
        });
      }

      // Update the scheduled time.
      data.scheduledAt = parsedTime;

      // Reset notification state only if the time actually changes.
      if (parsedTime.getTime() !== existing.scheduledAt.getTime()) {
        data.notificationReady = false;
        data.notificationReadyAt = null;
        data.notificationReadAt = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const updated = await prisma.reminder.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Reminder updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update reminder error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update reminder",
    });
  }
};


// Delete a reminder
const deleteReminder = async (req, res) => {
  try {
    const existing = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
    }

    await prisma.reminder.delete({
      where: { id: existing.id },
    });

    return res.status(200).json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("Delete reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete reminder",
    });
  }
};


const markReminderCompleted = async (req, res) => {
  try {
    const existing = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
    }

    const updated = await prisma.reminder.update({
      where: { id: existing.id },
      data: {
        isCompleted: !existing.isCompleted,
      },
    });

    return res.status(200).json({
      success: true,
      message: updated.isCompleted
        ? "Reminder marked as completed"
        : "Reminder marked as incomplete",
      data: updated,
    });
  } catch (error) {
    console.error("Complete reminder error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update reminder status",
    });
  }
};


module.exports = {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  markReminderCompleted
};
