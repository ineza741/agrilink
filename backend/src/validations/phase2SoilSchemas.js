const { z } = require("zod");

const sourceTypes = ["manual", "uploaded", "estimated"];

const soilTestBodySchema = z.object({
  farmId: z.string().uuid(),
  sourceType: z.enum(sourceTypes).optional(),
  ph: z.coerce.number().min(0).max(14),
  nitrogen: z.coerce.number().min(0).max(300),
  phosphorus: z.coerce.number().min(0).max(300),
  potassium: z.coerce.number().min(0).max(300),
  organicMatter: z.coerce.number().min(0).max(100),
  texture: z.string().min(2),
  notes: z.string().optional().nullable(),
  labReport: z
    .object({
      fileName: z.string().min(2),
      fileType: z.string().optional().nullable(),
      storageMode: z.string().optional().nullable(),
    })
    .optional(),
});

const soilTestCreateSchema = z.object({
  body: soilTestBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const soilTestUpdateSchema = z.object({
  body: soilTestBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const soilTestIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const farmSoilTestSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    farmId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  soilTestCreateSchema,
  soilTestUpdateSchema,
  soilTestIdSchema,
  farmSoilTestSchema,
};
