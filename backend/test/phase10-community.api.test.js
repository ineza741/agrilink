const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");
const prisma = require("../src/prisma/client");

const createdFarmerEmails = [];

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function registerDemoFarmer(overrides = {}) {
  const suffix = uniqueSuffix();
  const phoneSeed = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`.slice(-9);
  const payload = {
    fullName: `Community Farmer ${suffix}`,
    email: `community-farmer-${suffix}@agrisupport.rw`,
    phone: `07${phoneSeed}`,
    password: "Farmer@123",
    region: "Gatenga Sector, Kicukiro District",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    experienceLevel: "Intermediate",
    primaryCrop: "Maize",
    ...overrides,
  };

  const response = await request(app).post("/api/auth/register").send(payload);

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data?.token);
  createdFarmerEmails.push(payload.email);

  return {
    payload,
    auth: response.body.data,
  };
}

after(async () => {
  if (!createdFarmerEmails.length) return;

  await prisma.user.deleteMany({
    where: {
      email: {
        in: createdFarmerEmails,
      },
    },
  });
});

test("registered farmer can load community dashboard and persist community actions", async () => {
  const registration = await registerDemoFarmer();
  const farmerToken = registration.auth.token;

  const dashboardResponse = await request(app)
    .get("/api/community/dashboard")
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(dashboardResponse.status, 200);
  assert.equal(dashboardResponse.body.success, true);
  assert.ok(Array.isArray(dashboardResponse.body.data.discussions));
  assert.ok(Array.isArray(dashboardResponse.body.data.events));
  assert.ok(dashboardResponse.body.data.discussions.length > 0);
  assert.ok(dashboardResponse.body.data.events.length > 0);

  const selectedEventId = dashboardResponse.body.data.events[0].id;

  const questionResponse = await request(app)
    .post("/api/community/questions")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      question: "How should I sequence mulch and top-dressing when dry conditions are expected next week?",
      expert: "Dr. Alice Uwase",
    });

  assert.equal(questionResponse.status, 201);
  assert.equal(questionResponse.body.success, true);
  assert.equal(questionResponse.body.data.question.status, "Queued");
  const createdQuestionId = questionResponse.body.data.question.id;

  const registerEventResponse = await request(app)
    .post(`/api/community/events/${selectedEventId}/register`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({});

  assert.equal(registerEventResponse.status, 201);
  assert.equal(registerEventResponse.body.success, true);
  assert.equal(registerEventResponse.body.data.registration.eventId, selectedEventId);

  const practiceResponse = await request(app)
    .post("/api/community/practices/submissions")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      title: "Dry-spell mulch strip trial",
      body: "We used residue mulch around maize rows and reduced visible stress during the last two warm afternoons.",
      focus: "Climate-Smart Farming",
    });

  assert.equal(practiceResponse.status, 201);
  assert.equal(practiceResponse.body.success, true);
  assert.equal(practiceResponse.body.data.submission.status, "Pending validation");

  const acceptResponse = await request(app)
    .put(`/api/community/questions/${createdQuestionId}/accept`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({});

  assert.equal(acceptResponse.status, 200);
  assert.equal(acceptResponse.body.success, true);
  assert.equal(acceptResponse.body.data.question.accepted, true);
  assert.equal(acceptResponse.body.data.question.status, "Accepted");

  const finalDashboardResponse = await request(app)
    .get("/api/community/dashboard")
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(finalDashboardResponse.status, 200);
  assert.ok(finalDashboardResponse.body.data.joinedEvents.includes(selectedEventId));
  assert.ok(finalDashboardResponse.body.data.submittedPractices.some((item) => item.title === "Dry-spell mulch strip trial"));
  assert.ok(finalDashboardResponse.body.data.questions.some((item) => item.id === createdQuestionId && item.accepted === true));
});
