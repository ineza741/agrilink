import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { authService } from "../services/auth";

const STORAGE_KEY = "agri-feed-farmer-module-v1";
const DEFAULT_REGION = "Gatenga Sector, Kicukiro District";

const PROFILE_STATUS_BY_USER = {
  "user-farmer-1": "pending",
  "user-farmer-2": "verified",
  "user-farmer-3": "pending",
  "user-farmer-4": "pending",
  "user-farmer-5": "verified",
};

function normalizeRegion(region) {
  if (!region || region === "Unassigned Region") return DEFAULT_REGION;
  if (region === "Northern Highlands") return DEFAULT_REGION;
  return region;
}

const defaultFarmHistory = [
  {
    id: "history-1",
    crop: "Almonds",
    season: "2023",
    yield: "4.8 t/ha",
    challenges: "Water stress and aphid pressure",
  },
  {
    id: "history-2",
    crop: "Cover Crop",
    season: "2022",
    yield: "1.6 t/ha biomass",
    challenges: "Patchy germination in dry zones",
  },
];

const gatengaFarmSeed = {
  id: "farm-seed-gatenga",
  name: "Gatenga Demonstration Plot",
  plotLabel: "Plot C",
  region: "Gatenga Sector, Kicukiro District, Kigali City",
  sizeHectares: 3.5,
  landType: "Clay Loam",
  irrigationType: "Sprinkler Irrigation",
  primaryCrop: "Beans",
  cooperativeName: "Kigali Urban Growers Network",
  location: {
    lat: -1.9983,
    lng: 30.1038,
    mapX: 58,
    mapY: 61,
    label: "Gatenga Sector, Kicukiro District, Kigali City, Rwanda",
  },
  photoName: "gatenga-demonstration-plot.jpg",
  verificationStatus: "verified",
  history: [
    {
      id: "history-gatenga-1",
      crop: "Bush Beans",
      season: "2025 B",
      yield: "1.9 t/ha",
      challenges: "Short dry spell during flowering and localized aphid pressure",
    },
    {
      id: "history-gatenga-2",
      crop: "Leafy Vegetables",
      season: "2025 A",
      yield: "4.1 t/ha mixed harvest",
      challenges: "Waterlogging in low spots after intense rainfall",
    },
  ],
};

function createFarmRecord(ownerId, farm, overrides = {}) {
  return {
    id: overrides.id || `farm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ownerId,
    name: farm.name || "New Farm",
    plotLabel: farm.plotLabel || "Main Plot",
    region: normalizeRegion(farm.region),
    sizeHectares: Number(farm.sizeHectares || 0),
    landType: farm.landType || "",
    irrigationType: farm.irrigationType || "",
    primaryCrop: farm.primaryCrop || "",
    cooperativeName: farm.cooperativeName || "",
    location: {
      lat: Number(farm.location?.lat || farm.lat || 0),
      lng: Number(farm.location?.lng || farm.lng || 0),
      mapX: Number(farm.location?.mapX ?? farm.mapX ?? 50),
      mapY: Number(farm.location?.mapY ?? farm.mapY ?? 50),
      label: farm.location?.label || farm.locationLabel || "",
    },
    photoName: farm.photoName || "",
    status: farm.status || "active",
    verificationStatus: farm.verificationStatus || "pending",
    history:
      Array.isArray(farm.history) && farm.history.length
        ? farm.history.map((entry, index) => ({
            id: entry.id || `history-${Date.now()}-${index}`,
            crop: entry.crop || "",
            season: entry.season || "",
            yield: entry.yield || "",
            challenges: entry.challenges || "",
          }))
        : [],
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildProfileFromUser(user) {
  const verificationStatus =
    PROFILE_STATUS_BY_USER[user.id] || (user.role === "admin" ? "verified" : "pending");

  return {
    userId: user.id,
    fullName: user.name || "",
    email: user.email || "",
    contact: user.contact || "",
    region: normalizeRegion(user.region || ""),
    experienceLevel: user.experienceLevel || "",
    farmerType: user.farmerType || "Individual Farmer",
    cooperativeName: user.cooperativeName || "",
    notes: user.notes || "",
    verificationStatus,
    verifiedBy: verificationStatus === "verified" ? "AgriFeed Admin" : "",
    submittedAt: user.createdAt || new Date().toISOString(),
    approvedAt: verificationStatus === "verified" ? user.createdAt || new Date().toISOString() : "",
  };
}

function deriveAdminStatus(profile, farms) {
  if (profile?.verificationStatus === "deactivated" || profile?.verificationStatus === "inactive") {
    return "deactivated";
  }

  if (profile?.verificationStatus === "rejected") {
    return "rejected";
  }

  if (
    profile?.verificationStatus === "verified" ||
    farms.some((farm) => farm.verificationStatus === "verified")
  ) {
    return "verified";
  }

  return "pending";
}

function normalizeStoredData(data, users) {
  const normalizedProfiles = { ...data.profiles };
  Object.keys(normalizedProfiles).forEach((userId) => {
    normalizedProfiles[userId] = {
      ...normalizedProfiles[userId],
      region: normalizeRegion(normalizedProfiles[userId]?.region),
      verificationStatus:
        normalizedProfiles[userId]?.verificationStatus || PROFILE_STATUS_BY_USER[userId] || "pending",
    };
  });

  const normalizedFarms = data.farms.map((farm) => ({
    ...farm,
    region: normalizeRegion(farm.region),
    location: {
      ...farm.location,
      label:
        farm.location?.label === "Sector 4B - Main orchard"
          ? "Musanze central orchard block"
          : farm.location?.label === "Pilot research strip"
            ? "Rwamagana pilot research strip"
            : farm.location?.label || "",
    },
  }));

  return ensureProfiles(
    {
      ...data,
      profiles: normalizedProfiles,
      farms: normalizedFarms,
    },
    users
  );
}

function createSeedData(users) {
  const farmerUsers = users.filter((user) => user.role === "farmer");
  const profiles = {};

  farmerUsers.forEach((user) => {
    profiles[user.id] = buildProfileFromUser(user);
  });

  const primaryFarmer = farmerUsers[0];
  const farms = primaryFarmer
    ? [
        createFarmRecord(
          primaryFarmer.id,
          {
            name: "North Valley Orchard",
            plotLabel: "Plot A",
            region: "Musanze District",
            sizeHectares: 120,
            landType: "Loamy",
            irrigationType: "Drip Irrigation",
            primaryCrop: "Almonds",
            cooperativeName: "Highland Growers Cooperative",
            location: {
              lat: -1.4996,
              lng: 29.6344,
              mapX: 42,
              mapY: 37,
              label: "Musanze central orchard block",
            },
            photoName: "north-valley-orchard.jpg",
            verificationStatus: "verified",
            history: defaultFarmHistory,
          },
          { id: "farm-seed-1", createdAt: "2026-06-02T10:00:00.000Z" }
        ),
        createFarmRecord(
          primaryFarmer.id,
          {
            name: "Fresno Experimental Plot",
            plotLabel: "Plot B",
            region: "Rwamagana District",
            sizeHectares: 15,
            landType: "Sandy Loam",
            irrigationType: "IoT Enabled",
            primaryCrop: "Hybrid Corn",
            cooperativeName: "Highland Growers Cooperative",
            location: {
              lat: -1.9487,
              lng: 30.4347,
              mapX: 61,
              mapY: 68,
              label: "Rwamagana pilot research strip",
            },
            photoName: "fresno-experimental-plot.jpg",
            verificationStatus: "pending",
            history: [
              {
                id: "history-3",
                crop: "Hybrid Corn",
                season: "Current",
                yield: "Projected 6.2 t/ha",
                challenges: "Late nitrogen deficiency risk",
              },
              {
                id: "history-4",
                crop: "Soybeans",
                season: "2023",
                yield: "2.9 t/ha",
                challenges: "Heavy rainfall during flowering",
              },
            ],
          },
          { id: "farm-seed-2", createdAt: "2026-06-03T11:30:00.000Z" }
        ),
        createFarmRecord(
          primaryFarmer.id,
          gatengaFarmSeed,
          { id: gatengaFarmSeed.id, createdAt: "2026-06-13T09:15:00.000Z" }
        ),
      ]
    : [];

  return {
    profiles,
    farms,
    bulkRegistrations: [],
  };
}

function ensureRodrigueSeedFarm(data, users) {
  const primaryFarmer = users.find((user) => user.id === "user-farmer-1");
  if (!primaryFarmer) {
    return data;
  }

  const hasGatengaFarm = data.farms.some((farm) => farm.id === gatengaFarmSeed.id);
  if (hasGatengaFarm) {
    return data;
  }

  return {
    ...data,
    farms: [
      ...data.farms,
      createFarmRecord(primaryFarmer.id, gatengaFarmSeed, {
        id: gatengaFarmSeed.id,
        createdAt: "2026-06-13T09:15:00.000Z",
      }),
    ],
  };
}

function ensureDemoRegionalFarms(data, users) {
  const seedFarms = [
    {
      ownerId: "user-farmer-2",
      id: "farm-seed-nyamata",
      createdAt: "2026-06-14T09:05:00.000Z",
      farm: {
        name: "Nyamata Irrigation Block",
        plotLabel: "Plot A",
        region: "Nyamata Sector, Bugesera District",
        sizeHectares: 18,
        landType: "Sandy Clay",
        irrigationType: "Sprinkler Irrigation",
        primaryCrop: "Maize",
        cooperativeName: "Bugesera Grain Farmers",
        verificationStatus: "pending",
        location: {
          lat: -2.1514,
          lng: 30.1044,
          mapX: 54,
          mapY: 63,
          label: "Nyamata irrigation command area",
        },
        history: [
          {
            id: "history-nyamata-1",
            crop: "Maize",
            season: "2025 B",
            yield: "5.6 t/ha",
            challenges: "Water deficit during tasseling",
          },
        ],
      },
    },
    {
      ownerId: "user-farmer-3",
      id: "farm-seed-musanze",
      createdAt: "2026-06-15T10:20:00.000Z",
      farm: {
        name: "Musanze Potato Terrace",
        plotLabel: "Field North",
        region: "Musanze District",
        sizeHectares: 9,
        landType: "Volcanic Loam",
        irrigationType: "Rainfed + Supplemental",
        primaryCrop: "Irish Potato",
        cooperativeName: "Musanze Highlands Union",
        verificationStatus: "verified",
        location: {
          lat: -1.5011,
          lng: 29.6338,
          mapX: 43,
          mapY: 29,
          label: "Musanze potato terraces",
        },
        history: [
          {
            id: "history-musanze-1",
            crop: "Irish Potato",
            season: "2025 A",
            yield: "17.8 t/ha",
            challenges: "Late blight pressure after prolonged mist",
          },
        ],
      },
    },
    {
      ownerId: "user-farmer-4",
      id: "farm-seed-rwamagana",
      createdAt: "2026-06-16T12:40:00.000Z",
      farm: {
        name: "Rwamagana Banana Grove",
        plotLabel: "Block East",
        region: "Rwamagana District",
        sizeHectares: 6.2,
        landType: "Clay Loam",
        irrigationType: "Manual + Tank Storage",
        primaryCrop: "Bananas",
        cooperativeName: "Eastern Fruit Growers",
        verificationStatus: "pending",
        location: {
          lat: -1.9506,
          lng: 30.4342,
          mapX: 63,
          mapY: 57,
          label: "Rwamagana banana grove",
        },
        history: [
          {
            id: "history-rwamagana-1",
            crop: "Bananas",
            season: "2025",
            yield: "22.4 t/ha",
            challenges: "Low potassium in lower plot",
          },
        ],
      },
    },
    {
      ownerId: "user-farmer-5",
      id: "farm-seed-huye",
      createdAt: "2026-06-17T08:55:00.000Z",
      farm: {
        name: "Huye Coffee Learning Plot",
        plotLabel: "Station Demo",
        region: "Huye District",
        sizeHectares: 4.7,
        landType: "Well Drained Loam",
        irrigationType: "Drip Irrigation",
        primaryCrop: "Coffee",
        cooperativeName: "Southern Hills Coffee Network",
        verificationStatus: "verified",
        location: {
          lat: -2.5967,
          lng: 29.7394,
          mapX: 47,
          mapY: 76,
          label: "Huye coffee demo slope",
        },
        history: [
          {
            id: "history-huye-1",
            crop: "Coffee",
            season: "2025",
            yield: "2.1 t/ha clean coffee",
            challenges: "Berry disease scouting and shade pruning",
          },
        ],
      },
    },
  ];

  const validOwnerIds = new Set(users.filter((user) => user.role === "farmer").map((user) => user.id));
  const existingFarmIds = new Set(data.farms.map((farm) => farm.id));
  const missingSeedFarms = seedFarms.filter(
    (entry) => validOwnerIds.has(entry.ownerId) && !existingFarmIds.has(entry.id)
  );

  if (!missingSeedFarms.length) {
    return data;
  }

  return {
    ...data,
    farms: [
      ...data.farms,
      ...missingSeedFarms.map((entry) =>
        createFarmRecord(entry.ownerId, entry.farm, {
          id: entry.id,
          createdAt: entry.createdAt,
        })
      ),
    ],
  };
}

function ensureProfiles(data, users) {
  const nextProfiles = { ...data.profiles };
  let changed = false;

  users
    .filter((user) => user.role === "farmer")
    .forEach((user) => {
      if (!nextProfiles[user.id]) {
        nextProfiles[user.id] = buildProfileFromUser(user);
        changed = true;
      }
    });

  return changed
    ? {
        ...data,
        profiles: nextProfiles,
      }
    : data;
}

function loadFarmerData() {
  const users = authService.bootstrap();
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    const seeded = ensureDemoRegionalFarms(createSeedData(users), users);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(saved);
    const hydrated = ensureDemoRegionalFarms(
      ensureRodrigueSeedFarm(normalizeStoredData(parsed, users), users),
      users
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
    return hydrated;
  } catch {
    const seeded = ensureDemoRegionalFarms(createSeedData(users), users);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function computeProfileCompleteness(profile, farms) {
  if (!profile) {
    return 0;
  }

  const checks = [
    Boolean(profile.fullName),
    Boolean(profile.email),
    Boolean(profile.contact),
    Boolean(profile.region),
    Boolean(profile.experienceLevel),
    farms.length > 0,
    farms.some((farm) => Boolean(farm.photoName)),
    farms.some((farm) => farm.history.length > 0),
    farms.some((farm) => Boolean(farm.location?.lat) && Boolean(farm.location?.lng)),
    farms.some((farm) => Boolean(farm.landType) && Boolean(farm.primaryCrop)),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const FarmerDataContext = createContext(null);

export function FarmerDataProvider({ children }) {
  const { user, updateCurrentUser } = useAuth();
  const [data, setData] = useState(() => loadFarmerData());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const users = authService.bootstrap();
    setData((current) =>
      ensureDemoRegionalFarms(ensureRodrigueSeedFarm(normalizeStoredData(current, users), users), users)
    );
  }, [user?.id]);

  const value = useMemo(() => {
    const currentProfile = user?.role === "farmer" ? data.profiles[user.id] : null;
    const currentFarms =
      user?.role === "farmer" ? data.farms.filter((farm) => farm.ownerId === user.id) : [];

    return {
      data,
      currentProfile,
      currentFarms,
      getProfileByUserId: (userId) => data.profiles[userId] || null,
      getFarmsByOwner: (ownerId) => data.farms.filter((farm) => farm.ownerId === ownerId),
      getProfileCompleteness: (userId) =>
        computeProfileCompleteness(
          data.profiles[userId],
          data.farms.filter((farm) => farm.ownerId === userId)
        ),
      adminFarmerRows: authService
        .bootstrap()
        .filter((item) => item.role === "farmer")
        .map((farmerUser) => {
          const profile = data.profiles[farmerUser.id] || buildProfileFromUser(farmerUser);
          const farms = data.farms.filter((farm) => farm.ownerId === farmerUser.id);
          return {
            userId: farmerUser.id,
            initials: (profile.fullName || farmerUser.name || "UF")
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
            name: profile.fullName || farmerUser.name,
            id: `#FRM-${farmerUser.id.slice(-5).toUpperCase()}`,
            region: normalizeRegion(profile.region) || DEFAULT_REGION,
            status: deriveAdminStatus(profile, farms),
            joined: farmerUser.createdAt,
            farmCount: farms.length,
            completeness: computeProfileCompleteness(profile, farms),
            profile,
          };
        }),
      updateProfile: async (userId, updates) => {
        setData((current) => {
          const existingProfile = current.profiles[userId] || {};
          return {
            ...current,
            profiles: {
              ...current.profiles,
              [userId]: {
                ...existingProfile,
                ...updates,
              },
            },
          };
        });

        if (user?.id === userId) {
          const authUpdates = {};
          if (updates.fullName) authUpdates.name = updates.fullName;
          if (updates.email) authUpdates.email = updates.email;
          if (updates.contact) authUpdates.contact = updates.contact;
          if (updates.region) authUpdates.region = updates.region;
          if (updates.experienceLevel) authUpdates.experienceLevel = updates.experienceLevel;

          if (Object.keys(authUpdates).length) {
            await updateCurrentUser(authUpdates);
          }
        }
      },
      saveFarm: (ownerId, farmInput) => {
        let savedFarmId = farmInput.id;

        setData((current) => {
          const nextFarm =
            farmInput.id && current.farms.some((farm) => farm.id === farmInput.id)
              ? createFarmRecord(ownerId, farmInput, {
                  id: farmInput.id,
                  createdAt:
                    current.farms.find((farm) => farm.id === farmInput.id)?.createdAt ||
                    farmInput.createdAt,
                })
              : createFarmRecord(ownerId, farmInput);

          savedFarmId = nextFarm.id;

          return {
            ...current,
            farms: farmInput.id
              ? current.farms.map((farm) => (farm.id === farmInput.id ? nextFarm : farm))
              : [...current.farms, nextFarm],
          };
        });

        return savedFarmId;
      },
      saveBulkRegistration: (ownerId, payload) => {
        const batchId = `bulk-${Date.now()}`;
        const createdFarms = [
          createFarmRecord(ownerId, {
            ...payload.primaryFarm,
            cooperativeName: payload.cooperativeName,
            verificationStatus: "pending",
          }),
          ...payload.additionalPlots.map((plot) =>
            createFarmRecord(ownerId, {
              ...payload.primaryFarm,
              ...plot,
              name: plot.name || `${payload.primaryFarm.name} - ${plot.plotLabel || "Plot"}`,
              cooperativeName: payload.cooperativeName,
              verificationStatus: "pending",
            })
          ),
        ];

        setData((current) => ({
          ...current,
          farms: [...current.farms, ...createdFarms],
          bulkRegistrations: [
            ...current.bulkRegistrations,
            {
              id: batchId,
              ownerId,
              cooperativeName: payload.cooperativeName,
              plotCount: createdFarms.length,
              status: "submitted",
              createdAt: new Date().toISOString(),
            },
          ],
        }));

        return createdFarms.map((farm) => farm.id);
      },
      bulkOnboardFarmers: (records, approvedBy = "Administrator") => {
        const createdUsers = [];

        setData((current) => {
          const nextProfiles = { ...current.profiles };
          const nextFarms = [...current.farms];
          const nextBulkRegistrations = [...current.bulkRegistrations];

          records.forEach((record, index) => {
            const userRecord = authService.createUser({
              name: record.fullName,
              email: record.email,
              password: record.password || "Farmer123!",
              role: "farmer",
              contact: record.contact || "",
              region: record.region || DEFAULT_REGION,
              experienceLevel: record.experienceLevel || "Beginner",
              farmerType: record.farmerType || "Cooperative Member",
              cooperativeName: record.cooperativeName || "",
            });

            createdUsers.push(userRecord);
            nextProfiles[userRecord.id] = {
              ...buildProfileFromUser(userRecord),
              verificationStatus: "verified",
              verifiedBy: approvedBy,
              approvedAt: new Date().toISOString(),
            };

            const farmRecord = createFarmRecord(userRecord.id, {
              name: record.farmName || `${record.fullName}'s Plot`,
              plotLabel: record.plotLabel || "Main Plot",
              region: record.region || DEFAULT_REGION,
              sizeHectares: record.sizeHectares || 0,
              landType: record.landType || "",
              irrigationType: record.irrigationType || "",
              primaryCrop: record.primaryCrop || "",
              cooperativeName: record.cooperativeName || "",
              location: {
                lat: Number(record.location?.lat || 0),
                lng: Number(record.location?.lng || 0),
                mapX: Number(record.location?.mapX ?? 50),
                mapY: Number(record.location?.mapY ?? 50),
                label: record.location?.label || "",
              },
              verificationStatus: "verified",
              history: Array.isArray(record.history) ? record.history : [],
            });

            nextFarms.push(farmRecord);
            nextBulkRegistrations.push({
              id: `admin-bulk-${Date.now()}-${index}`,
              ownerId: userRecord.id,
              cooperativeName: record.cooperativeName || "Independent",
              plotCount: 1,
              status: "approved",
              createdAt: new Date().toISOString(),
            });
          });

          return {
            ...current,
            profiles: nextProfiles,
            farms: nextFarms,
            bulkRegistrations: nextBulkRegistrations,
          };
        });

        return createdUsers;
      },
      submitProfileForApproval: (userId) => {
        setData((current) => ({
          ...current,
          profiles: {
            ...current.profiles,
            [userId]: {
              ...current.profiles[userId],
              verificationStatus: "pending",
              submittedAt: new Date().toISOString(),
            },
          },
        }));
      },
      approveProfile: (userId, approvedBy = "Administrator") => {
        setData((current) => ({
          ...current,
          profiles: {
            ...current.profiles,
            [userId]: {
              ...current.profiles[userId],
              verificationStatus: "verified",
              verifiedBy: approvedBy,
              approvedAt: new Date().toISOString(),
            },
          },
          farms: current.farms.map((farm) =>
            farm.ownerId === userId
              ? {
                  ...farm,
                  verificationStatus: "verified",
                  updatedAt: new Date().toISOString(),
                }
              : farm
          ),
        }));
      },
      rejectProfile: (userId, rejectedBy = "Administrator") => {
        setData((current) => ({
          ...current,
          profiles: {
            ...current.profiles,
            [userId]: {
              ...current.profiles[userId],
              verificationStatus: "rejected",
              verifiedBy: rejectedBy,
              approvedAt: "",
            },
          },
          farms: current.farms.map((farm) =>
            farm.ownerId === userId
              ? {
                  ...farm,
                  verificationStatus: "pending",
                  updatedAt: new Date().toISOString(),
                }
              : farm
          ),
        }));
      },
      deactivateProfile: (userId) => {
        setData((current) => ({
          ...current,
          profiles: {
            ...current.profiles,
            [userId]: {
              ...current.profiles[userId],
              verificationStatus: "deactivated",
            },
          },
        }));
      },
      reactivateProfile: (userId) => {
        setData((current) => ({
          ...current,
          profiles: {
            ...current.profiles,
            [userId]: {
              ...current.profiles[userId],
              verificationStatus: "pending",
              submittedAt: new Date().toISOString(),
            },
          },
        }));
      },
      getRegionalSummary: () => {
        const rows = authService
          .bootstrap()
          .filter((item) => item.role === "farmer")
          .map((farmerUser) => {
            const profile = data.profiles[farmerUser.id] || buildProfileFromUser(farmerUser);
            const farms = data.farms.filter((farm) => farm.ownerId === farmerUser.id);
            return {
              region: profile.region || DEFAULT_REGION,
              farmerId: farmerUser.id,
              farmCount: farms.length,
              verifiedFarmCount: farms.filter((farm) => farm.verificationStatus === "verified").length,
            };
          });

        const regionMap = new Map();
        rows.forEach((row) => {
          const currentRegion = regionMap.get(row.region) || {
            region: row.region,
            farmers: 0,
            farms: 0,
            verified: 0,
          };
          currentRegion.farmers += 1;
          currentRegion.farms += row.farmCount;
          currentRegion.verified += row.verifiedFarmCount;
          regionMap.set(row.region, currentRegion);
        });

        return [...regionMap.values()].map((entry) => ({
          ...entry,
          verificationRate: entry.farms ? Math.round((entry.verified / entry.farms) * 100) : 0,
        }));
      },
    };
  }, [data, updateCurrentUser, user]);

  return <FarmerDataContext.Provider value={value}>{children}</FarmerDataContext.Provider>;
}

export function useFarmerData() {
  const context = useContext(FarmerDataContext);

  if (!context) {
    throw new Error("useFarmerData must be used within FarmerDataProvider.");
  }

  return context;
}
