const { z } = require("zod");

const reminderTypes = ["irrigation", "fertilizer"];
const reminderStatuses = ["Pending", "Completed", "Missed", "Skipped"];
const reminderPriorities = ["Low", "Medium", "High", "Critical"];
const sensorModes = ["manual", "sensor"];

const weatherSnapshotSchema = z.object({
  current: z.record(z.any()).optional().default({}),
  daily: z.record(z.any()).optional().default({}),
});

const soilProfileSchema = z.object({
  ph: z.coerce.number().min(0).max(14),
  nitrogen: z.coerce.number().min(0).max(500),
  phosphorus: z.coerce.number().min(0).max(500),
  potassium: z.coerce.number().min(0).max(500),
  organicMatter: z.coerce.number().min(0).max(100),
  texture: z.string().min(2),
  source: z.string().optional().nullable(),
});

const irrigationCalculationBodySchema = z.object({
  crop: z.string().min(2).optional(),
  cropStage: z.string().min(2).optional(),
  irrigationType: z.string().optional(),
  weather: weatherSnapshotSchema,
  soilProfile: soilProfileSchema,
  soilMoisture: z.coerce.number().min(0).max(100),
  sensorMode: z.enum(sensorModes).optional(),
  targetYield: z.coerce.number().min(0).max(1000),
  fertilizerType: z.string().min(2),
  budget: z.coerce.number().min(0).max(1000000000),
  weatherLabel: z.string().optional(),
  soilLabel: z.string().optional(),
  notice: z.string().optional().nullable(),
});

const farmIdParamsSchema = z.object({
  farmId: z.string().uuid(),
});

const reminderBodySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(reminderTypes),
  priority: z.enum(reminderPriorities).optional(),
  status: z.enum(reminderStatuses).optional(),
  note: z.string().optional().nullable(),
  advisoryId: z.string().uuid().optional().nullable(),
});

const reminderUpdateBodySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(reminderTypes).optional(),
  priority: z.enum(reminderPriorities).optional(),
  status: z.enum(reminderStatuses).optional(),
  note: z.string().optional().nullable(),
  advisoryId: z.string().uuid().optional().nullable(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one reminder field must be provided.",
});

const irrigationCalculationSchema = z.object({
  body: irrigationCalculationBodySchema,
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const irrigationLatestSchema = z.object({
  body: z.object({}).optional(),
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const irrigationReminderCreateSchema = z.object({
  body: reminderBodySchema,
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const irrigationReminderListSchema = z.object({
  body: z.object({}).optional(),
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const irrigationReminderUpdateSchema = z.object({
  body: reminderUpdateBodySchema,
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const irrigationReminderDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  irrigationCalculationSchema,
  irrigationLatestSchema,
  irrigationReminderCreateSchema,
  irrigationReminderListSchema,
  irrigationReminderUpdateSchema,
  irrigationReminderDeleteSchema,
};
