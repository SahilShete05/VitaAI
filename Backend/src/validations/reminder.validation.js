
const { z } = require("zod");

const scheduledAtSchema = z
  .string()
  .min(1, "Reminder time is required")
  .refine((value) => {
    return !Number.isNaN(new Date(value).getTime());
  }, "Please provide a valid reminder time");

const createReminderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Reminder title is required")
      .max(150, "Title must be at most 150 characters"),

    description: z
      .string()
      .trim()
      .max(1000, "Description must be at most 1000 characters")
      .nullable()
      .optional(),

    scheduledAt: scheduledAtSchema,
  })
  .strict();

const updateReminderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(150, "Title must be at most 150 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, "Description must be at most 1000 characters")
      .nullable()
      .optional(),

    scheduledAt: scheduledAtSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

module.exports = {
  createReminderSchema,
  updateReminderSchema,
};
