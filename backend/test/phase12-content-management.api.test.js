const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");

test("admin can load and mutate content management backend data", async () => {
  const loginResponse = await request(app).post("/api/auth/login").send({
    email: "admin@agrisupport.rw",
    password: "Admin@123",
  });

  assert.equal(loginResponse.statusCode, 200);
  const token = loginResponse.body?.data?.token;
  assert.ok(token);

  const dashboardResponse = await request(app)
    .get("/api/admin/content-management/dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(dashboardResponse.statusCode, 200);
  assert.equal(dashboardResponse.body?.success, true);
  assert.ok(dashboardResponse.body?.data?.entries?.Crops?.length >= 1);
  assert.ok(Array.isArray(dashboardResponse.body?.data?.auditTrail));

  const createResponse = await request(app)
    .post("/api/admin/content-management/entries")
    .set("Authorization", `Bearer ${token}`)
    .send({
      moduleType: "Advisory Templates",
      title: "Test Harvest Trigger",
      language: "English",
    });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body?.success, true);
  const createdEntryId = createResponse.body?.data?.entry?.id;
  assert.ok(createdEntryId);

  const advanceResponse = await request(app)
    .put(`/api/admin/content-management/entries/${createdEntryId}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({});

  assert.equal(advanceResponse.statusCode, 200);
  assert.equal(advanceResponse.body?.success, true);
  assert.equal(advanceResponse.body?.data?.entry?.status, "Pending Review");

  const sandboxTestResponse = await request(app)
    .post("/api/admin/content-management/sandbox/test")
    .set("Authorization", `Bearer ${token}`)
    .send({
      crop: "Maize (Hybrid)",
      soilPh: "6.2",
      nitrogen: "54",
      phosphorus: "28",
      potassium: "31",
      rainfall: "18",
      temperature: "26",
      growthStage: "Vegetative",
    });

  assert.equal(sandboxTestResponse.statusCode, 200);
  assert.equal(sandboxTestResponse.body?.success, true);
  assert.ok(sandboxTestResponse.body?.data?.run?.output?.confidence >= 54);

  const syncResponse = await request(app)
    .post("/api/admin/content-management/fertilizer-sync")
    .set("Authorization", `Bearer ${token}`)
    .send({});

  assert.equal(syncResponse.statusCode, 200);
  assert.equal(syncResponse.body?.success, true);
  assert.equal(syncResponse.body?.data?.synced, true);

  const deleteResponse = await request(app)
    .delete(`/api/admin/content-management/entries/${createdEntryId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(deleteResponse.body?.success, true);
  assert.equal(deleteResponse.body?.data?.deleted, true);
});
