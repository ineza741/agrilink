const { z } = require("zod");

const farmIdParamsSchema = z.object({
  farmId: z.string().uuid(),
});

const dateRanges = ["30D", "90D", "6M", "12M"];
const chartFilters = ["Monthly", "Quarterly", "Seasonal", "Annual"];
const farmerTemplates = [
  "Operations Summary",
  "Financial Report",
  "Crop Production Report",
  "Weather Impact Report",
  "Pest & Disease Report",
  "Irrigation Report",
  "Market Intelligence Report",
];
const adminTemplates = [
  "Government Report",
  "NGO Impact Report",
  "Farmer Performance Report",
  "Research Dataset",
  "Market Intelligence Report",
  "Pest Outbreak Analysis",
];
const complianceStandards = ["MINAGRI", "RAB", "FAO", "NGO"];
const exportFormats = ["pdf", "excel", "json", "share", "gis", "powerbi", "dataset", "report"];
const simpleRanges = ["7d", "30d", "90d"];

const farmerAnalyticsQuerySchema = z.object({
  dateRange: z.enum(dateRanges).optional(),
  cropType: z.string().min(2).optional(),
  activityFilter: z.enum(["All", "Verified", "Pending"]).optional(),
  reportTemplate: z.enum(farmerTemplates).optional(),
  chartFilter: z.enum(chartFilters).optional(),
});

const adminAnalyticsQuerySchema = z.object({
  reportTemplate: z.enum(adminTemplates).optional(),
  methodology: z.string().min(2).optional(),
  selectedComparison: z.string().min(2).optional(),
  selectedCompliance: z.enum(complianceStandards).optional(),
  selectedExportFormat: z.string().min(2).optional(),
});

const simpleReportQuerySchema = z.object({
  farmId: z.string().uuid().optional(),
  range: z.enum(simpleRanges).optional(),
});

const farmAnalyticsDashboardSchema = z.object({
  params: farmIdParamsSchema,
  query: farmerAnalyticsQuerySchema.optional(),
  body: z.object({}).optional(),
});

const farmAnalyticsHistorySchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const farmAnalyticsExportSchema = z.object({
  params: farmIdParamsSchema,
  query: z.object({}).optional(),
  body: z.object({
    format: z.enum(exportFormats),
    dateRange: z.enum(dateRanges).optional(),
    cropType: z.string().min(2).optional(),
    activityFilter: z.enum(["All", "Verified", "Pending"]).optional(),
    reportTemplate: z.enum(farmerTemplates).optional(),
    chartFilter: z.enum(chartFilters).optional(),
  }),
});

const adminAnalyticsDashboardSchema = z.object({
  params: z.object({}).optional(),
  query: adminAnalyticsQuerySchema.optional(),
  body: z.object({}).optional(),
});

const adminAnalyticsHistorySchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const adminAnalyticsExportSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    format: z.enum(exportFormats),
    reportTemplate: z.enum(adminTemplates).optional(),
    methodology: z.string().min(2).optional(),
    selectedComparison: z.string().min(2).optional(),
    selectedCompliance: z.enum(complianceStandards).optional(),
  }),
});

const simpleReportSchema = z.object({
  params: z.object({}).optional(),
  query: simpleReportQuerySchema.optional(),
  body: z.object({}).optional(),
});

module.exports = {
  farmAnalyticsDashboardSchema,
  farmAnalyticsHistorySchema,
  farmAnalyticsExportSchema,
  adminAnalyticsDashboardSchema,
  adminAnalyticsHistorySchema,
  adminAnalyticsExportSchema,
  simpleReportSchema,
  dateRanges,
  chartFilters,
  farmerTemplates,
  adminTemplates,
  complianceStandards,
};
