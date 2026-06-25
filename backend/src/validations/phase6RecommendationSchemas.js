const { z } = require("zod");

const farmIdParamsSchema = z.object({
  farmId: z.string().uuid(),
});

const runIdParamsSchema = z.object({
  runId: z.string().uuid(),
});

const recommendationStatusValues = [
  "Generated",
  "Viewed",
  "Approved",
  "Rejected",
  "Sent",
  "Applied",
  "Completed",
  "Pending Review",
];

const recommendationGenerateSchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({
    weather: z.object({
      temperature: z.coerce.number().optional(),
      humidity: z.coerce.number().optional(),
      rainProbability: z.coerce.number().optional(),
      rainfall: z.coerce.number().optional(),
      wind: z.coerce.number().optional(),
      source: z.string().optional(),
    }).optional(),
    weatherSourceLabel: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

const recommendationLatestSchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const recommendationHistorySchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const recommendationFeedbackCreateSchema = z.object({
  params: runIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({
    recommendationId: z.string().min(3),
    actionType: z.string().min(2),
    feedbackStatus: z.enum(recommendationStatusValues),
    rejectionReason: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  }),
});

const recommendationFeedbackListSchema = z.object({
  params: runIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

module.exports = {
  recommendationGenerateSchema,
  recommendationLatestSchema,
  recommendationHistorySchema,
  recommendationFeedbackCreateSchema,
  recommendationFeedbackListSchema,
  recommendationStatusValues,
};
