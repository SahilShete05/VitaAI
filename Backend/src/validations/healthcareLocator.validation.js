
const { z } = require("zod");

const healthcareLocatorSchema = z
  .object({
    latitude: z.coerce.number().min(-90).max(90),

    longitude: z.coerce.number().min(-180).max(180),

    category: z
      .enum([
        "all",
        "hospital",
        "clinic",
        "pharmacy",
        "specialist",
        "laboratory",
        "emergency",
      ])
      .optional()
      .default("all"),

    radius: z.coerce
      .number()
      .int()
      .min(500)
      .max(20000)
      .optional()
      .default(5000),
  })
  .strict();

module.exports = {
  healthcareLocatorSchema,
};
