import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { authService } from "../services/auth";

const STORAGE_KEY = "agri-feed-farmer-module-v1";

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

function createFarmRecord(ownerId, farm, overrides = {}) {
  return {
    id: overrides.id || `farm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ownerId,
    name: farm.name || "New Farm",
    plotLabel: farm.plotLabel || "Main Plot",
    region: farm.region || "Unassigned Region",
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
  return {
    userId: user.id,
    fullName: user.name || "",
    email: user.email || "",
    contact: user.contact || "",
    region: user.region || "",
    experienceLevel: user.experienceLevel || "",
    farmerType: user.farmerType || "Individual Farmer",
    cooperativeName: user.cooperativeName || "",
    notes: user.notes || "",
    verificationStatus: user.role === "admin" ? "verified" : "pending",
    verifiedBy: user.role === "admin" ? "System" : "",
    submittedAt: user.createdAt || new Date().toISOString(),
    approvedAt: user.role === "admin" ? user.createdAt || new Date().toISOString() : "",
  };
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
            region: "Northern Highlands",
            sizeHectares: 120,
            landType: "Loamy",
            irrigationType: "Drip Irrigation",
            primaryCrop: "Almonds",
            cooperativeName: "Highland Growers Cooperative",
            location: {
              lat: -1.9403,
              lng: 29.8739,
              mapX: 42,
              mapY: 37,
              label: "Sector 4B - Main orchard",
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
            region: "Northern Highlands",
            sizeHectares: 15,
            landType: "Sandy Loam",
            irrigationType: "IoT Enabled",
            primaryCrop: "Hybrid Corn",
            cooperativeName: "Highland Growers Cooperative",
            location: {
              lat: -1.9328,
              lng: 29.8611,
              mapX: 61,
              mapY: 68,
              label: "Pilot research strip",
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
      ]
    : [];

  return {
    profiles,
    farms,
    bulkRegistrations: [],
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
    const seeded = createSeedData(users);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(saved);
    const hydrated = ensureProfiles(parsed, users);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
    return hydrated;
  } catch {
    const seeded = createSeedData(users);
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
    setData((current) => ensureProfiles(current, users));
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
            region: profile.region || "Unassigned Region",
            status: profile.verificationStatus,
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
              region: record.region || "Unassigned Region",
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
              region: record.region || "Unassigned Region",
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
      deactivateProfile: (userId) => {
        setData((current) => ({
          ...current,
          profiles: {
            ...current.profiles,
            [userId]: {
              ...current.profiles[userId],
              verificationStatus: "inactive",
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
              region: profile.region || "Unassigned Region",
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
