const { z } = require("zod");

const farmIdParamsSchema = z.object({
  farmId: z.string().uuid(),
});

const diagnosisIdParamsSchema = z.object({
  diagnosisId: z.string().uuid(),
});

const weatherContributionSchema = z.object({
  current: z.object({
    temperature: z.coerce.number().optional(),
    humidity: z.coerce.number().optional(),
    rainfall: z.coerce.number().optional(),
    windSpeed: z.coerce.number().optional(),
    description: z.string().optional(),
  }).optional(),
  forecast: z.object({
    totalRain: z.coerce.number().optional(),
    humidDays: z.coerce.number().optional(),
    warmDays: z.coerce.number().optional(),
    peakHumidity: z.coerce.number().optional(),
    peakTemperature: z.coerce.number().optional(),
  }).optional(),
  explanation: z.string().optional(),
}).optional();

const pestAnalyzeSchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({
    crop: z.string().min(2),
    symptom: z.string().min(2),
    affectedArea: z.coerce.number().min(0).max(100),
    uploadedImageName: z.string().optional().nullable(),
    weatherContribution: weatherContributionSchema,
  }),
});

const pestFarmReadSchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const pestDiagnosisReadSchema = z.object({
  params: diagnosisIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const pestActionCreateSchema = z.object({
  params: diagnosisIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({
    recommendationId: z.string().min(2),
    actionType: z.string().min(2).default("Pest/Disease"),
    feedbackStatus: z.enum(["accepted", "rejected", "completed"]),
    rejectionReason: z.string().optional().nullable(),
  }),
});

const pestLibrarySchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    crop: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
  body: z.object({}).optional(),
});

module.exports = {
  pestAnalyzeSchema,
  pestFarmReadSchema,
  pestDiagnosisReadSchema,
  pestActionCreateSchema,
  pestLibrarySchema,
};
