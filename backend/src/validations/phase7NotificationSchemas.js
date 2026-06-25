const { z } = require("zod");

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const templateIdParamSchema = z.object({
  id: z.string().uuid(),
});

const notificationCenterSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    farmId: z.string().uuid().optional(),
  }).optional(),
  body: z.object({}).optional(),
});

const notificationPreferencesUpdateSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    delivery: z.record(z.boolean()).optional(),
    categories: z.record(z.boolean()).optional(),
    summaries: z.record(z.boolean()).optional(),
  }),
});

const notificationActionSchema = z.object({
  params: uuidParamSchema,
  query: z.object({}).optional(),
  body: z.object({
    farmId: z.string().uuid().optional(),
  }).optional(),
});

const notificationSnoozeSchema = z.object({
  params: uuidParamSchema,
  query: z.object({}).optional(),
  body: z.object({
    hours: z.coerce.number().int().min(1).max(72).optional(),
  }).optional(),
});

const notificationMarkAllReadSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    farmId: z.string().uuid().optional(),
  }).optional(),
});

const notificationTemplateStatusSchema = z.object({
  params: templateIdParamSchema,
  query: z.object({}).optional(),
  body: z.object({
    status: z.enum(["Draft", "Review", "Published", "Archived"]).optional(),
  }).optional(),
});

module.exports = {
  notificationCenterSchema,
  notificationPreferencesUpdateSchema,
  notificationActionSchema,
  notificationSnoozeSchema,
  notificationMarkAllReadSchema,
  notificationTemplateStatusSchema,
};
