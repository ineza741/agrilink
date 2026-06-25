const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");

test("admin can load regional monitoring data and publish advisory workflow", async () => {
  const loginResponse = await request(app).post("/api/auth/login").send({
    email: "admin@agrisupport.rw",
    password: "Admin@123",
  });

  assert.equal(loginResponse.statusCode, 200);
  const token = loginResponse.body?.data?.token;
  assert.ok(token);

  const regionalResponse = await request(app)
    .get("/api/admin/regional-monitoring")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(regionalResponse.statusCode, 200);
  assert.equal(regionalResponse.body?.success, true);
  assert.ok(Array.isArray(regionalResponse.body?.data?.districtProfiles));
  assert.ok(regionalResponse.body?.data?.districtProfiles.length >= 1);
  assert.ok(Array.isArray(regionalResponse.body?.data?.workflow));

  const advisoryResponse = await request(app)
    .post("/api/admin/regional-advisories")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Escalate scouting in Gatenga",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      category: "Pests & Diseases",
      severity: "High",
      message: "Field scouts should intensify bean aphid monitoring over the next 72 hours.",
      recommendedAction: "Inspect priority plots every 48 hours and report colony density.",
      deliveryChannel: "In-App",
      targetFarmers: 18,
    });

  assert.equal(advisoryResponse.statusCode, 201);
  assert.equal(advisoryResponse.body?.success, true);
  assert.equal(advisoryResponse.body?.data?.advisory?.district, "Kicukiro District");

  const workflowId = regionalResponse.body?.data?.workflow?.[0]?.id;
  assert.ok(workflowId);

  const workflowResponse = await request(app)
    .put(`/api/admin/workflow/${workflowId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "completed" });

  assert.equal(workflowResponse.statusCode, 200);
  assert.equal(workflowResponse.body?.success, true);
  assert.equal(workflowResponse.body?.data?.workflowItem?.status, "completed");
  assert.ok(Array.isArray(workflowResponse.body?.data?.summary?.workflow));
});
