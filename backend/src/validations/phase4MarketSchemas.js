const { z } = require("zod");

const timeframes = ["30D", "90D", "6M"];

const farmIdParamsSchema = z.object({
  farmId: z.string().uuid(),
});

const marketAnalyzeBodySchema = z.object({
  crop: z.string().min(2),
  timeframe: z.enum(timeframes).optional(),
  priceType: z.enum(["Wholesale", "Retail", "Farm Gate"]).optional(),
  marketName: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
});

const marketAnalyzeSchema = z.object({
  body: marketAnalyzeBodySchema,
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const marketLatestSchema = z.object({
  body: z.object({}).optional(),
  params: farmIdParamsSchema,
  query: z.object({
    crop: z.string().min(2).optional(),
    timeframe: z.enum(timeframes).optional(),
    priceType: z.enum(["Wholesale", "Retail", "Farm Gate"]).optional(),
    marketName: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
  }).optional(),
});

const marketAlertCreateSchema = z.object({
  body: z.object({
    crop: z.string().min(2),
    targetPrice: z.coerce.number().min(1).max(100000000),
    currentPrice: z.coerce.number().min(0).max(100000000),
    bestMarketName: z.string().optional().nullable(),
    status: z.string().optional(),
  }),
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const marketAlertListSchema = z.object({
  body: z.object({}).optional(),
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const marketAlertDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  marketAnalyzeSchema,
  marketLatestSchema,
  marketAlertCreateSchema,
  marketAlertListSchema,
  marketAlertDeleteSchema,
};
