const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const DEMO_TRENDING_TOPICS = [
  "Precision Agriculture",
  "Climate-Smart Farming",
  "Pest Management",
  "Market Trends",
  "Soil Health",
];

const DEMO_EXPERTS = [
  { name: "Dr. Alice Uwase", specialty: "Soil Management", organization: "RAB Extension Support", district: "Kigali City" },
  { name: "Jean Claude Habimana", specialty: "Crop Protection", organization: "Eastern Province Plant Health Unit", district: "Bugesera District" },
  { name: "Ing. Patrick Nshuti", specialty: "Climate Adaptation", organization: "Irrigation Innovation Lab", district: "Huye District" },
  { name: "Dr. Clementine Mukamana", specialty: "Plant Pathology", organization: "Northern Highlands Research Team", district: "Musanze District" },
  { name: "Vestine Mukeshimana", specialty: "Agribusiness", organization: "Market Intelligence Desk", district: "Rubavu District" },
];

const DEMO_DISCUSSIONS = [
  {
    title: "Optimizing Nitrogen Application in Maize for Gatenga Sector",
    summary: "Farmers are comparing split nitrogen application timing under moderate rainfall variability and looking for the best vegetative-stage strategy.",
    category: "Soil Management",
    crop: "Maize",
    region: "Gatenga Sector, Kicukiro District",
    topic: "Precision Fertilizer",
    expert: "Dr. Alice Uwase",
    replies: 18,
    views: 246,
    likes: 38,
    validationStatus: "Expert Validated",
    postedLabel: "Today",
    lastActivityLabel: "2 hours ago",
  },
  {
    title: "Managing Fall Armyworm in Eastern Province",
    summary: "Community reports from Bugesera and Rwamagana are comparing scouting intervals, pheromone trap placement, and safe response thresholds.",
    category: "Crop Protection",
    crop: "Maize",
    region: "Nyamata Sector, Bugesera District",
    topic: "Pest Management",
    expert: "Jean Claude Habimana",
    replies: 26,
    views: 411,
    likes: 52,
    validationStatus: "Community Validated",
    postedLabel: "Yesterday",
    lastActivityLabel: "6 hours ago",
  },
  {
    title: "Climate-Smart Irrigation Scheduling in Bugesera",
    summary: "Producers are comparing water-saving irrigation windows for vegetables under dry spells using short-term forecast trends.",
    category: "Climate Adaptation",
    crop: "Vegetables",
    region: "Nyamata Sector, Bugesera District",
    topic: "Climate-Smart Farming",
    expert: "Ing. Patrick Nshuti",
    replies: 14,
    views: 198,
    likes: 29,
    validationStatus: "Under Review",
    postedLabel: "Earlier",
    lastActivityLabel: "1 day ago",
  },
  {
    title: "Potato Late Blight Monitoring in Musanze District",
    summary: "Farmers and extension teams are aligning disease scouting frequency with humid weather windows to reduce treatment waste.",
    category: "Crop Protection",
    crop: "Potato",
    region: "Musanze District",
    topic: "Disease Forecasting",
    expert: "Dr. Clementine Mukamana",
    replies: 21,
    views: 305,
    likes: 47,
    validationStatus: "Expert Validated",
    postedLabel: "Earlier",
    lastActivityLabel: "2 days ago",
  },
];

const DEMO_QUESTIONS = [
  {
    question: "What is the best way to time top-dressing in maize when rainfall is expected to be low for the next week?",
    askedByName: "Rodrigue Farmer",
    expert: "Dr. Alice Uwase",
    response: "Apply only the first split now and hold the second split until the first effective rainfall event or irrigation support is confirmed.",
    status: "Answered",
    accepted: true,
    category: "Soil Management",
    postedLabel: "Today",
  },
  {
    question: "How can I reduce water use in dry-season vegetable production without losing market quality?",
    askedByName: "Claudine Uwera",
    expert: "Ing. Patrick Nshuti",
    response: "Shift irrigation to early morning, reduce unnecessary leaf wetting, and use mulch to stabilize the root zone.",
    status: "Answered",
    accepted: false,
    category: "Climate Adaptation",
    postedLabel: "Yesterday",
  },
];

const DEMO_STORIES = [
  {
    title: "Increased maize yield by 35% using precision fertilizer recommendations",
    summary: "A cooperative cluster in Rwamagana improved nutrient timing and used advisory-based split nitrogen application.",
    beforeAfter: "Yield improved from 4.2 t/ha to 5.7 t/ha",
    theme: "Innovation Showcase",
    climateSmart: true,
    district: "Rwamagana District",
  },
  {
    title: "Reduced water use by 28% through smart irrigation scheduling",
    summary: "Vegetable growers in Bugesera used forecast-linked irrigation windows to reduce pumping costs and preserve soil moisture.",
    beforeAfter: "Water use dropped from 5.4 mm/day to 3.9 mm/day",
    theme: "Climate-Smart Agriculture",
    climateSmart: true,
    district: "Bugesera District",
  },
  {
    title: "Improved potato disease management using AI alerts",
    summary: "Farmer groups in Musanze aligned fungicide timing with alert thresholds and reduced unnecessary sprays.",
    beforeAfter: "Blight-related loss reduced by 19%",
    theme: "Extension-Led Case Study",
    climateSmart: false,
    district: "Musanze District",
  },
];

const DEMO_EVENTS = [
  {
    title: "Maize Nutrient Management Workshop",
    type: "Workshop",
    dateLabel: "20 Jun 2026",
    venue: "Kicukiro Youth Center",
    region: "Kigali City",
    registrations: 46,
    seatsLeft: 14,
  },
  {
    title: "Climate-Smart Farming Webinar",
    type: "Webinar",
    dateLabel: "24 Jun 2026",
    venue: "Online",
    region: "National",
    registrations: 128,
    seatsLeft: 72,
  },
  {
    title: "Field Demonstration: Smart Irrigation in Bugesera",
    type: "Field Demo",
    dateLabel: "28 Jun 2026",
    venue: "Nyamata Demonstration Site",
    region: "Bugesera District",
    registrations: 31,
    seatsLeft: 19,
  },
];

const DEMO_PRACTICES = [
  { title: "Mulch-assisted moisture conservation", status: "Community Approved", rating: "4.6/5", focus: "Sustainability" },
  { title: "Split nitrogen application in maize", status: "Expert Verified", rating: "4.8/5", focus: "Yield Efficiency" },
  { title: "Trap-guided fall armyworm scouting", status: "Expert Verified", rating: "4.5/5", focus: "Crop Protection" },
];

const DEMO_RESOURCES = [
  { title: "Rwanda Maize Production Guide", type: "Extension Guide" },
  { title: "Climate Adaptation for Smallholder Irrigation", type: "Training Manual" },
  { title: "National Fertilizer Use Recommendations", type: "Government Publication" },
  { title: "Potato Disease Surveillance Protocol", type: "Research Paper" },
  { title: "Farmer Field Video: Moisture Conservation", type: "Video Tutorial" },
];

const DEMO_CONTRIBUTORS = [
  { name: "Rodrigue Farmer", contributions: 16, score: 92, rank: "Regional Champion" },
  { name: "Claudine Uwera", contributions: 13, score: 88, rank: "Knowledge Leader" },
  { name: "Jean Bosco Ndayisaba", contributions: 11, score: 84, rank: "Practice Validator" },
];

const DEMO_ACTIVITY_FEED = [
  { title: "New discussion opened on maize nitrogen timing", type: "Discussion", timeLabel: "1 hour ago" },
  { title: "Expert response posted on dry-season irrigation", type: "Expert Response", timeLabel: "3 hours ago" },
  { title: "Best practice validated in Rwamagana", type: "Validation", timeLabel: "Yesterday" },
  { title: "Field demo registration confirmed", type: "Event", timeLabel: "Yesterday" },
];

function timeAgoLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function postedLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return "Earlier";
}

async function ensureCommunitySeedData() {
  const count = await prisma.communityDiscussion.count();
  if (count > 0) return;

  const expertRecords = [];
  for (const expert of DEMO_EXPERTS) {
    expertRecords.push(await prisma.communityExpert.create({ data: expert }));
  }

  const expertMap = new Map(expertRecords.map((item) => [item.name, item.id]));

  await prisma.communityDiscussion.createMany({
    data: DEMO_DISCUSSIONS.map((item) => ({
      title: item.title,
      summary: item.summary,
      category: item.category,
      crop: item.crop,
      region: item.region,
      topic: item.topic,
      expertId: expertMap.get(item.expert) || null,
      replies: item.replies,
      views: item.views,
      likes: item.likes,
      validationStatus: item.validationStatus,
      postedLabel: item.postedLabel,
      lastActivityLabel: item.lastActivityLabel,
    })),
  });

  for (const item of DEMO_QUESTIONS) {
    await prisma.communityQuestion.create({
      data: {
        question: item.question,
        askedByName: item.askedByName,
        expertId: expertMap.get(item.expert) || null,
        response: item.response,
        status: item.status,
        accepted: item.accepted,
        category: item.category,
        postedLabel: item.postedLabel,
      },
    });
  }

  await prisma.communityStory.createMany({ data: DEMO_STORIES });
  await prisma.communityEvent.createMany({ data: DEMO_EVENTS });
  await prisma.communityPractice.createMany({ data: DEMO_PRACTICES });
  await prisma.communityResource.createMany({ data: DEMO_RESOURCES });
  await prisma.communityContributor.createMany({ data: DEMO_CONTRIBUTORS });
  await prisma.communityActivity.createMany({ data: DEMO_ACTIVITY_FEED });
}

function mapExpert(record) {
  return {
    id: record.id,
    name: record.name,
    specialty: record.specialty,
    organization: record.organization,
    district: record.district,
  };
}

function mapDiscussion(record) {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    category: record.category,
    crop: record.crop,
    region: record.region,
    topic: record.topic,
    expert: record.expert?.name || "Community Expert",
    replies: record.replies,
    views: record.views,
    likes: record.likes,
    validationStatus: record.validationStatus,
    postedAt: record.postedLabel || postedLabel(record.createdAt),
    lastActivity: record.lastActivityLabel || timeAgoLabel(record.updatedAt),
  };
}

function mapQuestion(record) {
  return {
    id: record.id,
    question: record.question,
    askedBy: record.askedByName,
    expert: record.expert?.name || "Community Expert",
    response: record.response,
    status: record.status,
    accepted: Boolean(record.accepted),
    category: record.category,
    postedAt: record.postedLabel || postedLabel(record.createdAt),
  };
}

function mapStory(record) {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    beforeAfter: record.beforeAfter,
    theme: record.theme,
    climateSmart: Boolean(record.climateSmart),
    district: record.district,
  };
}

function mapEvent(record, registrationCount, joinedEventIds) {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
    date: record.dateLabel,
    venue: record.venue,
    region: record.region,
    registrations: record.registrations + registrationCount,
    seatsLeft: Math.max(record.seatsLeft - registrationCount, 0),
    joined: joinedEventIds.includes(record.id),
  };
}

function mapPractice(record) {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    rating: record.rating,
    focus: record.focus,
  };
}

function mapPracticeSubmission(record) {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    focus: record.focus,
    status: record.status,
  };
}

function mapResource(record) {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
  };
}

function mapContributor(record) {
  return {
    id: record.id,
    name: record.name,
    contributions: record.contributions,
    score: record.score,
    rank: record.rank,
  };
}

function mapActivity(record) {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
    time: record.timeLabel || timeAgoLabel(record.createdAt),
  };
}

async function getDashboard(user) {
  await ensureCommunitySeedData();

  const [discussions, questions, stories, events, experts, practices, resources, contributors, activities, eventRegistrations, submittedPractices] = await Promise.all([
    prisma.communityDiscussion.findMany({ include: { expert: true }, orderBy: { createdAt: "desc" } }),
    prisma.communityQuestion.findMany({ include: { expert: true }, orderBy: { createdAt: "desc" } }),
    prisma.communityStory.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.communityEvent.findMany({ include: { registrationsList: true }, orderBy: { createdAt: "asc" } }),
    prisma.communityExpert.findMany({ orderBy: { name: "asc" } }),
    prisma.communityPractice.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.communityResource.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.communityContributor.findMany({ orderBy: [{ score: "desc" }, { contributions: "desc" }] }),
    prisma.communityActivity.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.communityEventRegistration.findMany({ where: { userId: user.id } }),
    prisma.communityPracticeSubmission.findMany({ where: { submittedByUserId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const joinedEventIds = eventRegistrations.map((item) => item.eventId);

  const stats = {
    totalDiscussions: discussions.length,
    activeExperts: experts.length,
    validatedPractices: practices.filter((item) => /approved|verified/i.test(item.status)).length,
    upcomingEvents: events.length,
    knowledgeArticles: resources.length + stories.length,
  };

  const impactMetrics = {
    practicesAdopted: Math.max(1280, practices.length * 140 + submittedPractices.length * 18),
    farmersReached: Math.max(6420, discussions.reduce((sum, item) => sum + item.views, 0) + contributors.length * 110),
    questionsResolved: questions.filter((item) => /answered|accepted/i.test(item.status)).length,
    resourcesShared: Math.max(214, resources.length * 32 + stories.length * 18),
  };

  return {
    stats,
    impactMetrics,
    discussions: discussions.map(mapDiscussion),
    questions: questions.map(mapQuestion),
    stories: stories.map(mapStory),
    events: events.map((item) => mapEvent(item, item.registrationsList.length, joinedEventIds)),
    experts: experts.map(mapExpert),
    trendingTopics: DEMO_TRENDING_TOPICS,
    practices: practices.map(mapPractice),
    resources: resources.map(mapResource),
    contributors: contributors.map(mapContributor),
    activityFeed: activities.map(mapActivity),
    joinedEvents: joinedEventIds,
    submittedPractices: submittedPractices.map(mapPracticeSubmission),
    sourceMode: "backend",
    sourceLabels: ["Local Data", "Demo Knowledge Data", "Backend Community Data"],
  };
}

async function submitQuestion(user, payload) {
  await ensureCommunitySeedData();

  const expert = await prisma.communityExpert.findFirst({
    where: {
      OR: [{ id: payload.expert }, { name: payload.expert }],
    },
  });

  if (!expert) {
    throw new ApiError(404, "Community expert not found.");
  }

  const question = await prisma.communityQuestion.create({
    data: {
      question: payload.question,
      askedByUserId: user.id,
      askedByName: user.fullName,
      expertId: expert.id,
      response: "Pending expert response.",
      status: "Queued",
      accepted: false,
      category: expert.specialty,
      postedLabel: "Today",
    },
    include: { expert: true },
  });

  await prisma.communityActivity.create({
    data: {
      title: `New expert question submitted for ${expert.name}`,
      type: "Expert Response",
      timeLabel: "Just now",
      actorUserId: user.id,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "COMMUNITY_QUESTION_SUBMITTED",
    entityType: "CommunityQuestion",
    entityId: question.id,
    details: { expert: expert.name },
  });

  return {
    question: mapQuestion(question),
    dashboard: await getDashboard(user),
  };
}

async function acceptQuestion(user, questionId) {
  const existing = await prisma.communityQuestion.findUnique({
    where: { id: questionId },
    include: { expert: true },
  });

  if (!existing) {
    throw new ApiError(404, "Community question not found.");
  }

  if (user.role === "Farmer" && existing.askedByUserId && existing.askedByUserId !== user.id) {
    throw new ApiError(403, "You can only accept answers for your own community questions.");
  }

  const question = await prisma.communityQuestion.update({
    where: { id: questionId },
    data: {
      accepted: true,
      status: "Accepted",
    },
    include: { expert: true },
  });

  await prisma.communityActivity.create({
    data: {
      title: `Expert answer accepted for ${question.expert?.name || "community expert"}`,
      type: "Validation",
      timeLabel: "Just now",
      actorUserId: user.id,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "COMMUNITY_QUESTION_ACCEPTED",
    entityType: "CommunityQuestion",
    entityId: question.id,
    details: { status: "Accepted" },
  });

  return {
    question: mapQuestion(question),
    dashboard: await getDashboard(user),
  };
}

async function registerEvent(user, eventId) {
  await ensureCommunitySeedData();

  const event = await prisma.communityEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new ApiError(404, "Community event not found.");
  }

  const registration = await prisma.communityEventRegistration.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId: user.id,
      },
    },
    update: {},
    create: {
      eventId,
      userId: user.id,
    },
  });

  await prisma.communityActivity.create({
    data: {
      title: `${user.fullName} registered for ${event.title}`,
      type: "Event",
      timeLabel: "Just now",
      actorUserId: user.id,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "COMMUNITY_EVENT_REGISTERED",
    entityType: "CommunityEvent",
    entityId: event.id,
    details: { title: event.title },
  });

  return {
    registration: {
      id: registration.id,
      eventId: registration.eventId,
      userId: registration.userId,
    },
    dashboard: await getDashboard(user),
  };
}

async function submitPractice(user, payload) {
  const submission = await prisma.communityPracticeSubmission.create({
    data: {
      title: payload.title,
      body: payload.body,
      focus: payload.focus,
      status: "Pending validation",
      submittedByUserId: user.id,
      submittedByName: user.fullName,
    },
  });

  await prisma.communityActivity.create({
    data: {
      title: `New practice submitted: ${payload.title}`,
      type: "Validation",
      timeLabel: "Just now",
      actorUserId: user.id,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "COMMUNITY_PRACTICE_SUBMITTED",
    entityType: "CommunityPracticeSubmission",
    entityId: submission.id,
    details: { focus: payload.focus },
  });

  return {
    submission: mapPracticeSubmission(submission),
    dashboard: await getDashboard(user),
  };
}

module.exports = {
  getDashboard,
  submitQuestion,
  acceptQuestion,
  registerEvent,
  submitPractice,
};
