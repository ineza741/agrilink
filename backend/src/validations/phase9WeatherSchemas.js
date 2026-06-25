const { z } = require("zod");

const farmIdParamsSchema = z.object({
  farmId: z.string().uuid(),
});

const weatherRangeSchema = z.enum(["1M", "6M", "1Y"]).optional();

const farmWeatherDashboardSchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({
    range: weatherRangeSchema,
  }).optional(),
  body: z.object({}).optional(),
});

const farmWeatherHistorySchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).optional(),
  }).optional(),
  body: z.object({}).optional(),
});

module.exports = {
  farmWeatherDashboardSchema,
  farmWeatherHistorySchema,
};
