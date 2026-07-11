require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DEMO_FARM_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_CROP_HISTORY_ID = "22222222-2222-4222-8222-222222222222";
const DEMO_SOIL_TEST_ID = "33333333-3333-4333-8333-333333333333";

async function upsertUserWithProfile({
  email,
  password,
  role,
  fullName,
  phone,
  profile,
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      phone,
      role,
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      fullName,
      phone,
      role,
      isActive: true,
      passwordHash,
    },
  });

  if (profile) {
    await prisma.farmerProfile.upsert({
      where: { userId: user.id },
      update: profile,
      create: {
        ...profile,
        userId: user.id,
      },
    });
  }

  return user;
}

async function main() {
  const admin = await upsertUserWithProfile({
    email: "admin@agrisupport.rw",
    password: "Admin@123",
    role: "Admin",
    fullName: "AgriSupport Admin",
    phone: "+250788100001",
  });

  const officer = await upsertUserWithProfile({
    email: "officer@agrisupport.rw",
    password: "Officer@123",
    role: "ExtensionOfficer",
    fullName: "Regional Extension Officer",
    phone: "+250788100002",
  });

  const marketOfficer = await upsertUserWithProfile({
    email: "market@agrisupport.rw",
    password: "Market@123",
    role: "MarketOfficer",
    fullName: "Jean Mugabo",
    phone: "+250788100004",
  });

  await prisma.user.update({
    where: { id: marketOfficer.id },
    data: {
      accountStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  });

  await prisma.marketOfficerProfile.upsert({
    where: { userId: marketOfficer.id },
    update: {
      fullName: "Jean Mugabo",
      phone: "+250788100004",
      marketName: "Kicukiro New Modern Market",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      organization: "Rwanda Agriculture Board",
      employeeNumber: "MO-2026-001",
    },
    create: {
      userId: marketOfficer.id,
      fullName: "Jean Mugabo",
      phone: "+250788100004",
      marketName: "Kicukiro New Modern Market",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      organization: "Rwanda Agriculture Board",
      employeeNumber: "MO-2026-001",
    },
  });

  const farmer = await upsertUserWithProfile({
    email: "farmer@agrisupport.rw",
    password: "Farmer@123",
    role: "Farmer",
    fullName: "Rodrigue Farmer",
    phone: "+250788100003",
    profile: {
      region: "Kigali City",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      experienceLevel: "Intermediate",
      primaryCrop: "Maize",
      verificationStatus: "Pending",
      profileCompleteness: 78,
      reviewNotes: "Awaiting admin verification.",
    },
  });

  const farmerProfile = await prisma.farmerProfile.findUnique({
    where: { userId: farmer.id },
  });

  if (!farmerProfile) {
    throw new Error("Farmer profile seed failed.");
  }

  const farm = await prisma.farm.upsert({
    where: { id: DEMO_FARM_ID },
    update: {
      farmName: "Gatenga Demonstration Plot",
      province: "Kigali City",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      latitude: -1.9706,
      longitude: 30.1044,
      farmSize: 2.5,
      farmSizeUnit: "hectares",
      landType: "Mixed Cropland",
      soilType: "Loam",
      currentCrop: "Maize",
      cropStage: "Vegetative",
      ownershipType: "Owned",
      farmerProfileId: farmerProfile.id,
    },
    create: {
      id: DEMO_FARM_ID,
      farmName: "Gatenga Demonstration Plot",
      province: "Kigali City",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      latitude: -1.9706,
      longitude: 30.1044,
      farmSize: 2.5,
      farmSizeUnit: "hectares",
      landType: "Mixed Cropland",
      soilType: "Loam",
      currentCrop: "Maize",
      cropStage: "Vegetative",
      ownershipType: "Owned",
      farmerProfileId: farmerProfile.id,
    },
  });

  await prisma.cropHistory.upsert({
    where: { id: DEMO_CROP_HISTORY_ID },
    update: {
      farmId: farm.id,
      cropName: "Beans",
      season: "Season B",
      year: 2025,
      yieldAmount: 1.8,
      yieldUnit: "tons/ha",
      challenges: "Late rainfall onset and minor aphid outbreak.",
      notes: "Yield recovered after supplementary irrigation.",
    },
    create: {
      id: DEMO_CROP_HISTORY_ID,
      farmId: farm.id,
      cropName: "Beans",
      season: "Season B",
      year: 2025,
      yieldAmount: 1.8,
      yieldUnit: "tons/ha",
      challenges: "Late rainfall onset and minor aphid outbreak.",
      notes: "Yield recovered after supplementary irrigation.",
    },
  });

  const soilTest = await prisma.soilTest.upsert({
    where: { id: DEMO_SOIL_TEST_ID },
    update: {
      farmId: farm.id,
      sourceType: "manual",
      ph: 6.5,
      nitrogen: 38,
      phosphorus: 21,
      potassium: 17,
      organicMatter: 2.7,
      texture: "Loamy",
      notes: "Baseline local soil sample for Gatenga demonstration plot.",
      analysisStatus: "Analyzed",
      regionContext: farm.province,
      districtContext: farm.district,
      sectorContext: farm.sector,
      analyzedAt: new Date("2026-06-18T08:30:00.000Z"),
    },
    create: {
      id: DEMO_SOIL_TEST_ID,
      farmId: farm.id,
      sourceType: "manual",
      ph: 6.5,
      nitrogen: 38,
      phosphorus: 21,
      potassium: 17,
      organicMatter: 2.7,
      texture: "Loamy",
      notes: "Baseline local soil sample for Gatenga demonstration plot.",
      analysisStatus: "Analyzed",
      regionContext: farm.province,
      districtContext: farm.district,
      sectorContext: farm.sector,
      analyzedAt: new Date("2026-06-18T08:30:00.000Z"),
    },
  });

  await prisma.soilLabReport.upsert({
    where: { soilTestId: soilTest.id },
    update: {
      fileName: "gatenga-baseline-soil-report.pdf",
      fileType: "application/pdf",
      storageMode: "demo-local",
    },
    create: {
      soilTestId: soilTest.id,
      fileName: "gatenga-baseline-soil-report.pdf",
      fileType: "application/pdf",
      storageMode: "demo-local",
    },
  });

  await prisma.cropSuitabilityResult.deleteMany({
    where: { soilTestId: soilTest.id },
  });

  await prisma.cropSuitabilityResult.createMany({
    data: [
      {
        soilTestId: soilTest.id,
        farmId: farm.id,
        cropName: "Maize",
        suitabilityScore: 98,
        suitabilityBand: "Best Fit",
        recommendationSummary: "Maize is a strong fit under the current soil profile.",
        limitingFactors: [
          "Nitrogen is lower than the ideal threshold for peak yield.",
          "Potassium is slightly below the preferred range.",
        ],
      },
      {
        soilTestId: soilTest.id,
        farmId: farm.id,
        cropName: "Soybean",
        suitabilityScore: 91,
        suitabilityBand: "Good Fit",
        recommendationSummary: "Soybean is viable with nitrogen and potassium balancing.",
        limitingFactors: [
          "Organic matter should be improved before planting.",
        ],
      },
      {
        soilTestId: soilTest.id,
        farmId: farm.id,
        cropName: "Irish Potato",
        suitabilityScore: 78,
        suitabilityBand: "Good Fit",
        recommendationSummary: "Irish Potato is viable with pH and potassium monitoring.",
        limitingFactors: ["Potassium remains below the best range for tuber bulking."],
      },
    ],
  });

  await prisma.fertilizerRecommendation.deleteMany({
    where: { soilTestId: soilTest.id },
  });

  await prisma.fertilizerRecommendation.create({
    data: {
      soilTestId: soilTest.id,
      farmId: farm.id,
      nitrogenKgHa: 132,
      phosphorusKgHa: 41,
      potassiumKgHa: 54,
      recommendedBlend: "Precision NPK",
      applicationTiming:
        "Apply phosphorus before planting, nitrogen during vegetative growth in split doses, and potassium during cob fill.",
      budgetNote: "Budget pressure likely if all nutrients are applied at once. Consider split application.",
      recommendationSummary: "Fertilizer guidance generated from baseline local soil values and crop demand thresholds.",
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: admin.id,
        action: "SEED_ADMIN_READY",
        entityType: "User",
        entityId: admin.id,
        details: JSON.stringify({ role: "Admin" }),
      },
      {
        actorUserId: officer.id,
        action: "SEED_EXTENSION_OFFICER_READY",
        entityType: "User",
        entityId: officer.id,
        details: JSON.stringify({ role: "ExtensionOfficer" }),
      },
      {
        actorUserId: farmer.id,
        action: "SEED_FARMER_READY",
        entityType: "FarmerProfile",
        entityId: farmerProfile.id,
        details: JSON.stringify({ farmId: farm.id }),
      },
    ],
    skipDuplicates: true,
  });

  const CROP_PRICES = [
    { cropName: "Wheat", wholesalePrice: 860, retailPrice: 950, farmGatePrice: 780, marketName: "Kicukiro New Modern Market", district: "Kicukiro District", sector: "Gatenga Sector" },
    { cropName: "Corn", wholesalePrice: 680, retailPrice: 760, farmGatePrice: 620, marketName: "Kimironko Market", district: "Gasabo District", sector: "Kimironko Sector" },
    { cropName: "Soybeans", wholesalePrice: 930, retailPrice: 1020, farmGatePrice: 870, marketName: "Nyabugogo Market", district: "Nyarugenge District", sector: "Nyabugogo Sector" },
    { cropName: "Rice", wholesalePrice: 1420, retailPrice: 1560, farmGatePrice: 1320, marketName: "Musanze Main Market", district: "Musanze District", sector: "Muhoza Sector" },
    { cropName: "Barley", wholesalePrice: 720, retailPrice: 790, farmGatePrice: 660, marketName: "Huye Central Market", district: "Huye District", sector: "Ngoma Sector" },
    { cropName: "Beans", wholesalePrice: 980, retailPrice: 1080, farmGatePrice: 910, marketName: "Zinia Market", district: "Kicukiro District", sector: "Kicukiro Sector" },
    { cropName: "Irish Potato", wholesalePrice: 520, retailPrice: 610, farmGatePrice: 470, marketName: "Musanze Main Market", district: "Musanze District", sector: "Muhoza Sector" },
    { cropName: "Sweet Potato", wholesalePrice: 460, retailPrice: 530, farmGatePrice: 410, marketName: "Nyamata Market", district: "Bugesera District", sector: "Nyamata Sector" },
    { cropName: "Cassava", wholesalePrice: 430, retailPrice: 500, farmGatePrice: 390, marketName: "Ngoma Trading Point", district: "Huye District", sector: "Ngoma Sector" },
    { cropName: "Sorghum", wholesalePrice: 610, retailPrice: 690, farmGatePrice: 560, marketName: "Rwamagana Market", district: "Rwamagana District", sector: "Kigabiro Sector" },
    { cropName: "Banana", wholesalePrice: 380, retailPrice: 430, farmGatePrice: 340, marketName: "Rubavu Border Market", district: "Rubavu District", sector: "Gisenyi Sector" },
    { cropName: "Plantain", wholesalePrice: 420, retailPrice: 470, farmGatePrice: 380, marketName: "Gisenyi Produce Market", district: "Rubavu District", sector: "Gisenyi Sector" },
    { cropName: "Groundnuts", wholesalePrice: 1450, retailPrice: 1580, farmGatePrice: 1360, marketName: "Kanserege Market", district: "Kicukiro District", sector: "Kicukiro Sector" },
    { cropName: "Peas", wholesalePrice: 890, retailPrice: 960, farmGatePrice: 820, marketName: "Kayonza Market", district: "Kayonza District", sector: "Kayonza Sector" },
    { cropName: "Coffee", wholesalePrice: 2100, retailPrice: 2380, farmGatePrice: 1950, marketName: "Kinigi Exchange Point", district: "Musanze District", sector: "Kinigi Sector" },
    { cropName: "Tea", wholesalePrice: 1750, retailPrice: 1940, farmGatePrice: 1620, marketName: "Huye Central Market", district: "Huye District", sector: "Ngoma Sector" },
  ];

  for (const price of CROP_PRICES) {
    const existing = await prisma.cropPrice.findFirst({
      where: { cropName: price.cropName, marketName: price.marketName, status: "Active" },
    });

    if (!existing) {
      const cropPrice = await prisma.cropPrice.create({
        data: {
          cropName: price.cropName,
          marketName: price.marketName,
          district: price.district,
          sector: price.sector,
          unit: "kg",
          currency: "RWF",
          wholesalePrice: price.wholesalePrice,
          retailPrice: price.retailPrice,
          farmGatePrice: price.farmGatePrice,
          effectiveDate: new Date(),
          status: "Active",
          source: "System Seed",
          notes: "Initial seed data for crop prices.",
          createdByUserId: marketOfficer.id,
        },
      });

      await prisma.cropPriceHistory.create({
        data: {
          cropPriceId: cropPrice.id,
          cropName: price.cropName,
          marketName: price.marketName,
          district: price.district,
          oldWholesale: 0,
          newWholesale: price.wholesalePrice,
          oldRetail: 0,
          newRetail: price.retailPrice,
          oldFarmGate: 0,
          newFarmGate: price.farmGatePrice,
          effectiveDate: new Date(),
          changedByUserId: marketOfficer.id,
          reason: "Initial seed data",
          status: "Published",
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Phase 2 demo data seeded successfully.");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
