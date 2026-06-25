const { z } = require("zod");

const uuidParam = z.object({
  id: z.string().uuid(),
});

const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(3),
    email: z.string().email(),
    phone: z.string().min(8),
    password: z.string().min(8),
    region: z.string().min(2),
    district: z.string().min(2),
    sector: z.string().min(2),
    experienceLevel: z.string().min(2),
    primaryCrop: z.string().min(2),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateMyProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).optional(),
    phone: z.string().min(8).optional(),
    region: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    sector: z.string().min(2).optional(),
    experienceLevel: z.string().min(2).optional(),
    primaryCrop: z.string().min(2).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const farmerIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const reviewSchema = z.object({
  body: z.object({
    reason: z.string().min(3).optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const farmSchema = z.object({
  body: z.object({
    farmName: z.string().min(2),
    province: z.string().min(2),
    district: z.string().min(2),
    sector: z.string().min(2),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    farmSize: z.coerce.number().positive(),
    farmSizeUnit: z.string().min(2),
    landType: z.string().min(2),
    soilType: z.string().min(2).optional().nullable(),
    currentCrop: z.string().min(2),
    cropStage: z.string().min(2),
    ownershipType: z.string().min(2),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const farmUpdateSchema = z.object({
  body: z.object({
    farmName: z.string().min(2).optional(),
    province: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    sector: z.string().min(2).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    farmSize: z.coerce.number().positive().optional(),
    farmSizeUnit: z.string().min(2).optional(),
    landType: z.string().min(2).optional(),
    soilType: z.string().min(2).optional().nullable(),
    currentCrop: z.string().min(2).optional(),
    cropStage: z.string().min(2).optional(),
    ownershipType: z.string().min(2).optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const farmIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const cropHistorySchema = z.object({
  body: z.object({
    cropName: z.string().min(2),
    season: z.string().min(2),
    year: z.coerce.number().int().min(2000).max(2100),
    yieldAmount: z.coerce.number().nonnegative().optional().nullable(),
    yieldUnit: z.string().min(2).optional().nullable(),
    challenges: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
  params: z.object({
    farmId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const cropHistoryFarmIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    farmId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const cropHistoryIdSchema = z.object({
  body: z.object({
    cropName: z.string().min(2).optional(),
    season: z.string().min(2).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    yieldAmount: z.coerce.number().nonnegative().optional().nullable(),
    yieldUnit: z.string().min(2).optional().nullable(),
    challenges: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateMyProfileSchema,
  farmerIdSchema,
  reviewSchema,
  farmSchema,
  farmUpdateSchema,
  farmIdSchema,
  cropHistorySchema,
  cropHistoryFarmIdSchema,
  cropHistoryIdSchema,
  uuidParam,
};
