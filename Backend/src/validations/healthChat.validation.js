
const { z } = require("zod");

const coordinateSchema = {
  latitude: z.coerce.number().finite().min(-90).max(90).optional(),
  longitude: z.coerce.number().finite().min(-180).max(180).optional(),
};

const healthChatSchema = z
  .object({
    message: z.string().trim().min(1).max(3000),

    language: z
      .enum(["en", "hi", "mr", "English", "Hindi", "Marathi"])
      .default("en"),

    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(3000),
          })
          .strict()
      )
      .max(10)
      .default([]),

    privateMode: z.boolean().default(false),

    ...coordinateSchema,
  })
  .strict()
  .refine(
    (data) =>
      (data.latitude === undefined) ===
      (data.longitude === undefined),
    {
      message: "Latitude and longitude must be provided together",
      path: ["latitude"],
    }
  );

module.exports = { healthChatSchema };
