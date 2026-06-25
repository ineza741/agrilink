const { z } = require("zod");

const communityDashboardSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

const communityQuestionCreateSchema = z.object({
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  body: z.object({
    question: z.string().trim().min(8).max(1200),
    expert: z.string().trim().min(2).max(120),
  }),
});

const communityQuestionAcceptSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const communityEventRegisterSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const communityPracticeSubmissionSchema = z.object({
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  body: z.object({
    title: z.string().trim().min(4).max(180),
    body: z.string().trim().min(12).max(2400),
    focus: z.string().trim().min(2).max(120),
  }),
});

module.exports = {
  communityDashboardSchema,
  communityQuestionCreateSchema,
  communityQuestionAcceptSchema,
  communityEventRegisterSchema,
  communityPracticeSubmissionSchema,
};
