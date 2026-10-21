
const { z } = require("zod");

// Accept ISO date strings, null, or empty strings.
// The controller converts valid dates into JavaScript Date objects.
const dateOfBirthSchema = z
  .union([
    z.string().refine((value) => {
      if (value === "") return true;

      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    }, "Please provide a valid date of birth"),
    z.null(),
  ]);

const createFamilyMemberSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),

    relationship: z
      .string()
      .trim()
      .min(1, "Relationship is required")
      .max(50, "Relationship must be at most 50 characters"),

    dateOfBirth: dateOfBirthSchema.optional(),

    gender: z
      .string()
      .trim()
      .max(30, "Gender must be at most 30 characters")
      .nullable()
      .optional(),
  })
  .strict();

const updateFamilyMemberSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(100, "Name must be at most 100 characters")
      .optional(),

    relationship: z
      .string()
      .trim()
      .min(1, "Relationship cannot be empty")
      .max(50, "Relationship must be at most 50 characters")
      .optional(),

    dateOfBirth: dateOfBirthSchema.optional(),

    gender: z
      .string()
      .trim()
      .max(30, "Gender must be at most 30 characters")
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

module.exports = {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
};
