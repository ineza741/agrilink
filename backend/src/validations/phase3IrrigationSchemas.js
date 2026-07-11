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
  soilProfile: soilProfileSchema.optional(),
  soilMoisture: z.coerce.number().min(0).max(100),
  sensorMode: z.enum(sensorModes).optional(),
  targetYield: z.coerce.number().min(0).max(1000).optional(),
  fertilizerType: z.string().min(2).optional(),
  budget: z.coerce.number().min(0).max(1000000000).optional(),
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

// --- Irrigation Record Schemas ---

const irrigationRecordCreateBodySchema = z.object({
  irrigationDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid irrigation date.",
  }),
  waterAmount: z.coerce.number().min(0.1),
  irrigationMethod: z.string().min(2),
  durationMinutes: z.coerce.number().int().min(1).optional(),
  completionStatus: z.enum(["Completed", "Scheduled", "Missed", "Cancelled"]).optional(),
  notes: z.string().optional().nullable(),
});

const irrigationRecordCreateSchema = z.object({
  body: irrigationRecordCreateBodySchema,
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const irrigationRecordHistorySchema = z.object({
  body: z.object({}).optional(),
  params: farmIdParamsSchema,
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).optional(),
});

const irrigationRecordUpdateSchema = z.object({
  body: z.object({
    irrigationDate: z.string().optional(),
    waterAmount: z.coerce.number().min(0.1).optional(),
    irrigationMethod: z.string().min(2).optional(),
    durationMinutes: z.coerce.number().int().min(1).optional(),
    completionStatus: z.enum(["Completed", "Scheduled", "Missed", "Cancelled"]).optional(),
    notes: z.string().optional().nullable(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  }),
  params: z.object({
    recordId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

// --- Soil Moisture Schemas ---

const soilMoistureCreateBodySchema = z.object({
  moisture: z.coerce.number().min(0).max(100),
  measuredAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid measurement date.",
  }),
  source: z.enum(["Manual Entry", "IoT Sensor", "Uploaded Soil/Lab Record", "Saved Field Measurement"]).optional(),
  notes: z.string().optional().nullable(),
});

const soilMoistureCreateSchema = z.object({
  body: soilMoistureCreateBodySchema,
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const soilMoistureLatestSchema = z.object({
  body: z.object({}).optional(),
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
});

const irrigationRecordIdParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  irrigationCalculationSchema,
  irrigationLatestSchema,
  irrigationReminderCreateSchema,
  irrigationReminderListSchema,
  irrigationReminderUpdateSchema,
  irrigationReminderDeleteSchema,
  irrigationRecordCreateSchema,
  irrigationRecordHistorySchema,
  irrigationRecordUpdateSchema,
  soilMoistureCreateSchema,
  soilMoistureLatestSchema,
};
