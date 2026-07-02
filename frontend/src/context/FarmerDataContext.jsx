import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { authService } from "../services/auth";
import {
  isBackendSessionActive,
  mapBackendProfileToFrontendProfile,
  phase1BackendService,
} from "../services/phase1Backend";

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
      boundary: farm.location?.boundary || null,
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
    PROFILE_STATUS_BY_USER[user.id] || (["admin", "extensionofficer"].includes(user.role) ? "verified" : "pending");

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

function mergeBackendProfileIntoData(current, userId, profile) {
  if (!profile) {
    return current;
  }

  return {
    ...current,
    profiles: {
      ...current.profiles,
      [userId]: {
        ...(current.profiles[userId] || {}),
        ...profile,
      },
    },
  };
}

function mergeBackendFarmsIntoData(current, userId, backendFarms) {
  if (!Array.isArray(backendFarms)) {
    return current;
  }

  const existingOwnerFarms = current.farms.filter((farm) => farm.ownerId === userId);
  const backendFarmIds = new Set(backendFarms.map((farm) => farm.id));
  const localOnlyFarms = existingOwnerFarms.filter((farm) => !backendFarmIds.has(farm.id));
  const otherOwnerFarms = current.farms.filter((farm) => farm.ownerId !== userId);

  return {
    ...current,
    farms: [...otherOwnerFarms, ...backendFarms, ...localOnlyFarms],
  };
}

function mergeBackendRegistryIntoData(current, records) {
  if (!Array.isArray(records) || !records.length) {
    return current;
  }

  const nextProfiles = { ...current.profiles };
  const nextFarms = current.farms.filter(
    (farm) => !records.some((record) => record.userId === farm.ownerId)
  );

  records.forEach((record) => {
    nextProfiles[record.userId] = {
      ...(nextProfiles[record.userId] || {}),
      ...record.profile,
    };
    nextFarms.push(...record.farms);
  });

  return {
    ...current,
    profiles: nextProfiles,
    farms: nextFarms,
  };
}

const FarmerDataContext = createContext(null);

export function FarmerDataProvider({ children }) {
  const { user, updateCurrentUser } = useAuth();
  const [data, setData] = useState(() => loadFarmerData());
  const [backendAdminRows, setBackendAdminRows] = useState([]);
  const [backendAdminSummary, setBackendAdminSummary] = useState(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [backendTimedOut, setBackendTimedOut] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const BACKEND_TIMEOUT_MS = 5000; // 5 seconds


  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const users = authService.bootstrap();
    setData((current) =>
      ensureDemoRegionalFarms(ensureRodrigueSeedFarm(normalizeStoredData(current, users), users), users)
    );
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    async function syncBackendFarmerData() {
      if (!user || user.role !== "farmer" || !isBackendSessionActive()) {
        if (isMounted) {
          setIsBackendLoading(false);
          setBackendTimedOut(false);
          setBackendError(null);
        }
        return;
      }

      if (isMounted) {
        setIsBackendLoading(true);
        setBackendTimedOut(false);
        setBackendError(null);
      }

      const backendFetchPromise = Promise.all([
        phase1BackendService.farmers.me(),
        phase1BackendService.farms.my(user.id, data.farms.filter((farm) => farm.ownerId === user.id)),
      ]);

      const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Backend data fetch timed out."));
        }, BACKEND_TIMEOUT_MS);
      });

      try {
        const [backendProfile, backendFarms] = await Promise.race([
          backendFetchPromise,
          timeoutPromise,
        ]);

        if (!isMounted) {
          return;
        }
        clearTimeout(timeoutId);

        setData((current) =>
          mergeBackendFarmsIntoData(
            mergeBackendProfileIntoData(current, user.id, backendProfile),
            user.id,
            backendFarms
          )
        );

        const userProfile = mapBackendProfileToFrontendProfile({
          user: {
            id: user.id,
            fullName: backendProfile.fullName || user.name,
            email: backendProfile.email || user.email,
            phone: backendProfile.contact || user.contact,
          },
          ...backendProfile,
        });

        await updateCurrentUser({
          name: userProfile.fullName,
          fullName: userProfile.fullName,
          contact: userProfile.contact,
          region: userProfile.region,
          district: backendProfile.district || user.district,
          sector: backendProfile.sector || user.sector,
          experienceLevel: userProfile.experienceLevel,
          primaryCrop: backendProfile.primaryCrop || user.primaryCrop,
          verificationStatus: backendProfile.verificationStatus || user.verificationStatus,
          profileCompleteness: backendProfile.profileCompleteness || user.profileCompleteness || 0,
        });

        if (isMounted) {
          setIsBackendLoading(false);
          setBackendTimedOut(false);
          setBackendError(null);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        clearTimeout(timeoutId);

        console.warn("Failed to sync farmer backend data:", error);
        if (error.message === "Backend data fetch timed out.") {
          setBackendTimedOut(true);
        } else {
          setBackendError(error);
        }
        setIsBackendLoading(false);
        // Keep frontend-only local data active when the Phase 1 backend is unavailable.
      }
    }

    syncBackendFarmerData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user?.id, isBackendSessionActive, BACKEND_TIMEOUT_MS, data.farms, updateCurrentUser]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    async function syncBackendAdminData() {
      if (!user || !["admin", "extensionofficer"].includes(user.role) || !isBackendSessionActive()) {
        if (isMounted) {
          setBackendAdminRows([]);
          setBackendAdminSummary(null);
          setIsBackendLoading(false);
          setBackendTimedOut(false);
          setBackendError(null);
        }
        return;
      }

      if (isMounted) {
        setIsBackendLoading(true);
        setBackendTimedOut(false);
        setBackendError(null);
      }

      const backendFetchPromise = Promise.all([
        phase1BackendService.farmers.list(),
        phase1BackendService.admin.dashboardSummary(),
      ]);

      const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Backend data fetch timed out."));
        }, BACKEND_TIMEOUT_MS);
      });

      try {
        const [records, summary] = await Promise.race([
          backendFetchPromise,
          timeoutPromise,
        ]);

        if (!isMounted) {
          return;
        }
        clearTimeout(timeoutId);

        setBackendAdminRows(records.map((record) => record.row));
        setBackendAdminSummary(summary);
        setData((current) => mergeBackendRegistryIntoData(current, records));

        if (isMounted) {
          setIsBackendLoading(false);
          setBackendTimedOut(false);
          setBackendError(null);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        clearTimeout(timeoutId);

        console.warn("Failed to sync admin backend data:", error);
        if (error.message === "Backend data fetch timed out.") {
          setBackendTimedOut(true);
        } else {
          setBackendError(error);
        }
        setIsBackendLoading(false);

        if (isMounted) {
          setBackendAdminRows([]);
          setBackendAdminSummary(null);
        }
      }
    }

    syncBackendAdminData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user?.id, user?.role, isBackendSessionActive, BACKEND_TIMEOUT_MS, data.farms]);

  const value = useMemo(() => {
    const currentProfile = user?.role === "farmer" ? data.profiles[user.id] : null;
    const currentFarms =
      user?.role === "farmer" ? data.farms.filter((farm) => farm.ownerId === user.id) : [];
    const localAdminFarmerRows = authService
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
      });
    const effectiveAdminFarmerRows =
      (["admin", "extensionofficer"].includes(user?.role) && !isBackendLoading && !backendTimedOut)
        ? backendAdminRows
        : localAdminFarmerRows;

    return {
      data,
      adminDashboardSummary: backendAdminSummary,
      currentProfile,
      currentFarms,
      isBackendLoading,
      backendTimedOut,
      backendError,      getProfileByUserId: (userId) => data.profiles[userId] || null,
      getFarmsByOwner: (ownerId) => data.farms.filter((farm) => farm.ownerId === ownerId),
      loadFarmerProfileDetails: async (userId) => {
        const localProfile = data.profiles[userId] || null;
        const localFarms = data.farms.filter((farm) => farm.ownerId === userId);
        const localRecord = {
          userId,
          profile: localProfile,
          farms: localFarms,
          row:
            effectiveAdminFarmerRows.find((row) => row.userId === userId) ||
            (localProfile
              ? {
                  userId,
                  name: localProfile.fullName,
                  region: localProfile.region,
                  status: localProfile.verificationStatus,
                  farmCount: localFarms.length,
                  completeness: computeProfileCompleteness(localProfile, localFarms),
                  profile: localProfile,
                }
              : null),
        };

        if (!["admin", "extensionofficer"].includes(user?.role) || !isBackendSessionActive()) {
          return localRecord;
        }

        try {
          const backendProfileId = data.profiles[userId]?.backendProfileId;
          if (!backendProfileId) {
            return localRecord;
          }

          const backendRecord = await phase1BackendService.farmers.getById(backendProfileId);
          setData((current) => mergeBackendRegistryIntoData(current, [backendRecord]));
          setBackendAdminRows((current) => {
            const nextRows = current.filter((row) => row.userId !== userId);
            nextRows.push(backendRecord.row);
            return nextRows;
          });
          return backendRecord;
        } catch {
          return localRecord;
        }
      },
      getProfileCompleteness: (userId) =>
        computeProfileCompleteness(
          data.profiles[userId],
          data.farms.filter((farm) => farm.ownerId === userId)
        ),
      adminFarmerRows: effectiveAdminFarmerRows,
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

        const existingProfile = data.profiles[userId] || {};

        if (user?.id === userId && isBackendSessionActive()) {
          try {
            const backendProfile = await phase1BackendService.farmers.updateMe(updates, existingProfile);
            setData((current) => mergeBackendProfileIntoData(current, userId, backendProfile));
          } catch {
            // Keep local profile data for frontend demo mode when backend update is unavailable.
          }
        }

        if (user?.id === userId) {
          const authUpdates = {};
          if (updates.fullName) authUpdates.name = updates.fullName;
          if (updates.fullName) authUpdates.fullName = updates.fullName;
          if (updates.email) authUpdates.email = updates.email;
          if (updates.contact) authUpdates.contact = updates.contact;
          if (updates.region) authUpdates.region = updates.region;
          if (updates.experienceLevel) authUpdates.experienceLevel = updates.experienceLevel;

          if (Object.keys(authUpdates).length) {
            await updateCurrentUser(authUpdates);
          }
        }
      },
      saveFarm: async (ownerId, farmInput) => {
        let localFarmId = farmInput.id;
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

          localFarmId = nextFarm.id;
          savedFarmId = nextFarm.id;

          return {
            ...current,
            farms: farmInput.id
              ? current.farms.map((farm) => (farm.id === farmInput.id ? nextFarm : farm))
              : [...current.farms, nextFarm],
          };
        });

        if (user?.id === ownerId && user.role === "farmer" && isBackendSessionActive()) {
          try {
            const existingFarm =
              data.farms.find((farm) => farm.id === localFarmId) ||
              data.farms.find((farm) => farm.id === savedFarmId) ||
              farmInput;
            const syncedFarm = farmInput.id
              ? await phase1BackendService.farms.update(ownerId, farmInput.id, farmInput, existingFarm)
              : await phase1BackendService.farms.create(ownerId, farmInput, existingFarm);

            let refreshedHistory = syncedFarm.history || [];
            const historyRows = Array.isArray(farmInput.history) ? farmInput.history : [];
            if (historyRows.length) {
              const existingHistory = await phase1BackendService.cropHistory.listByFarm(syncedFarm.id);
              await Promise.all(existingHistory.map((entry) => phase1BackendService.cropHistory.remove(entry.id)));
              await Promise.all(
                historyRows
                  .filter((row) => row?.crop)
                  .map((row) =>
                    phase1BackendService.cropHistory.create(syncedFarm.id, {
                      ...row,
                      cropName: row.crop,
                    })
                  )
              );
              refreshedHistory = await phase1BackendService.cropHistory.listByFarm(syncedFarm.id);
            }

            savedFarmId = syncedFarm.id;
            setData((current) => {
              const nextFarms = current.farms
                .filter((farm) => farm.id !== localFarmId)
                .map((farm) =>
                  farm.id === savedFarmId
                    ? {
                        ...syncedFarm,
                        history: refreshedHistory,
                      }
                    : farm
                );

              if (!nextFarms.some((farm) => farm.id === syncedFarm.id)) {
                nextFarms.push({
                  ...syncedFarm,
                  history: refreshedHistory,
                });
              }

              return {
                ...current,
                farms: nextFarms,
              };
            });
          } catch {
            // Keep locally saved farm record when backend save is not available.
          }
        }

        return savedFarmId;
      },
      syncFarmCropHistory: async (farmId, historyRows = []) => {
        const farm = data.farms.find((item) => item.id === farmId);

        if (!farm) {
          return [];
        }

        const sanitizedRows = historyRows
          .filter((row) => row?.crop || row?.cropName)
          .map((row) => ({
            ...row,
            crop: row.crop || row.cropName || "",
            season: row.season || `${new Date().getFullYear()}`,
            year:
              row.year ||
              Number(String(row.season || "").split(" ").pop()) ||
              new Date().getFullYear(),
            yieldAmount:
              row.yieldAmount !== undefined && row.yieldAmount !== null
                ? row.yieldAmount
                : Number.parseFloat(String(row.yield || "").replace(/[^0-9.]/g, "")) || null,
            yieldUnit:
              row.yieldUnit ||
              (String(row.yield || "").replace(/[0-9.\s]/g, "").trim() || "t/ha"),
            notes: row.notes || row.yield || "",
          }));

        setData((current) => ({
          ...current,
          farms: current.farms.map((item) =>
            item.id === farmId
              ? {
                  ...item,
                  history: sanitizedRows.map((row, index) => ({
                    id: row.id || `history-${Date.now()}-${index}`,
                    crop: row.crop,
                    season: row.season,
                    yield:
                      row.yield ||
                      (row.yieldAmount !== null && row.yieldAmount !== undefined
                        ? `${row.yieldAmount} ${row.yieldUnit || ""}`.trim()
                        : ""),
                    challenges: row.challenges || "",
                    year: row.year,
                    yieldAmount: row.yieldAmount,
                    yieldUnit: row.yieldUnit,
                    notes: row.notes || "",
                  })),
                }
              : item
          ),
        }));

        if (!isBackendSessionActive() || user?.role !== "farmer") {
          return sanitizedRows;
        }

        try {
          const existingHistory = await phase1BackendService.cropHistory.listByFarm(farmId);
          await Promise.all(existingHistory.map((entry) => phase1BackendService.cropHistory.remove(entry.id)));
          await Promise.all(
            sanitizedRows.map((row) => phase1BackendService.cropHistory.create(farmId, row))
          );
          const refreshedHistory = await phase1BackendService.cropHistory.listByFarm(farmId);

          setData((current) => ({
            ...current,
            farms: current.farms.map((item) =>
              item.id === farmId
                ? {
                    ...item,
                    history: refreshedHistory,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            ),
          }));

          return refreshedHistory;
        } catch {
          return sanitizedRows;
        }
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
      bulkOnboardFarmers: async (records, approvedBy = "Administrator") => {
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

        if (["admin", "extensionofficer"].includes(user?.role) && isBackendSessionActive()) {
          try {
            const backendRecords = [];

            for (const [index, record] of records.entries()) {
              const registration = await phase1BackendService.auth.registerFarmerForAdmin({
                fullName: record.fullName,
                email: record.email,
                contact: record.contact,
                phone: record.contact,
                region: record.region,
                experienceLevel: record.experienceLevel,
                primaryCrop: record.primaryCrop,
                password: record.password || "Farmer@123",
              });

              if (!registration?.user?.id || !registration?.token) {
                continue;
              }

              const starterFarm = await phase1BackendService.farms.createWithToken(
                registration.user.id,
                {
                  name: record.farmName || `${record.fullName}'s Plot`,
                  plotLabel: record.plotLabel || "Main Plot",
                  sizeHectares: record.sizeHectares || 2 + index,
                  landType: record.landType || "Loamy",
                  region: record.region || DEFAULT_REGION,
                  irrigationType: record.irrigationType || "Drip Irrigation",
                  primaryCrop: record.primaryCrop || "Maize",
                  soilType: record.landType || "Loamy",
                  cropStage: record.cropStage || "Vegetative",
                  ownershipType: record.plotLabel || "Farmer managed",
                  location: {
                    lat: Number(record.location?.lat || -1.9983),
                    lng: Number(record.location?.lng || 30.1038),
                    label: record.location?.label || record.region || DEFAULT_REGION,
                  },
                  history: Array.isArray(record.history) ? record.history : [],
                },
                registration.token
              );

              const backendRecord = await phase1BackendService.farmers.getById(
                registration.user.farmerProfileId
              );

              backendRecords.push({
                ...backendRecord,
                farms: backendRecord.farms?.length ? backendRecord.farms : [starterFarm],
              });
            }

            if (backendRecords.length) {
              const summary = await phase1BackendService.admin.dashboardSummary();
              setBackendAdminSummary(summary);
              setBackendAdminRows((current) => {
                const nextRows = current.filter(
                  (row) => !backendRecords.some((record) => record.userId === row.userId)
                );
                return [...nextRows, ...backendRecords.map((record) => record.row)];
              });
              setData((current) => mergeBackendRegistryIntoData(current, backendRecords));
            }
          } catch {
            // Keep local bulk onboarding records when backend workflow is unavailable.
          }
        }

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
      approveProfile: async (userId, approvedBy = "Administrator") => {
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

        if (["admin", "extensionofficer"].includes(user?.role) && isBackendSessionActive()) {
          try {
            const updated = await phase1BackendService.farmers.approve(
              data.profiles[userId]?.backendProfileId || userId
            );
            const summary = await phase1BackendService.admin.dashboardSummary();
            setBackendAdminRows((current) =>
              current.map((row) => (row.userId === userId ? updated.row : row))
            );
            setBackendAdminSummary(summary);
            setData((current) => mergeBackendRegistryIntoData(current, [updated]));
          } catch {
            // Keep local approval result in demo mode fallback.
          }
        }
      },
      rejectProfile: async (userId, rejectedBy = "Administrator") => {
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

        if (["admin", "extensionofficer"].includes(user?.role) && isBackendSessionActive()) {
          try {
            const updated = await phase1BackendService.farmers.reject(
              data.profiles[userId]?.backendProfileId || userId,
              `${rejectedBy} rejected this farmer profile.`
            );
            const summary = await phase1BackendService.admin.dashboardSummary();
            setBackendAdminRows((current) =>
              current.map((row) => (row.userId === userId ? updated.row : row))
            );
            setBackendAdminSummary(summary);
            setData((current) => mergeBackendRegistryIntoData(current, [updated]));
          } catch {
            // Keep local rejection result in demo mode fallback.
          }
        }
      },
      deactivateProfile: async (userId) => {
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

        if (["admin", "extensionofficer"].includes(user?.role) && isBackendSessionActive()) {
          try {
            const updated = await phase1BackendService.farmers.deactivate(
              data.profiles[userId]?.backendProfileId || userId
            );
            const summary = await phase1BackendService.admin.dashboardSummary();
            setBackendAdminRows((current) =>
              current.map((row) => (row.userId === userId ? updated.row : row))
            );
            setBackendAdminSummary(summary);
            setData((current) => mergeBackendRegistryIntoData(current, [updated]));
          } catch {
            // Keep local deactivation result in demo mode fallback.
          }
        }
      },
      reactivateProfile: async (userId) => {
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

        if (["admin", "extensionofficer"].includes(user?.role) && isBackendSessionActive()) {
          try {
            const updated = await phase1BackendService.farmers.reactivate(
              data.profiles[userId]?.backendProfileId || userId
            );
            const summary = await phase1BackendService.admin.dashboardSummary();
            setBackendAdminRows((current) =>
              current.map((row) => (row.userId === userId ? updated.row : row))
            );
            setBackendAdminSummary(summary);
            setData((current) => mergeBackendRegistryIntoData(current, [updated]));
          } catch {
            // Keep local reactivation result in demo mode fallback.
          }
        }
      },
      getRegionalSummary: () => {
        const rows = effectiveAdminFarmerRows.map((row) => {
          const farms = data.farms.filter((farm) => farm.ownerId === row.userId);
          return {
            region: row.region || DEFAULT_REGION,
            farmerId: row.userId,
            farmCount: farms.length || row.farmCount || 0,
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
  }, [backendAdminRows, backendAdminSummary, data, updateCurrentUser, user, isBackendLoading, backendTimedOut, backendError]);

  return <FarmerDataContext.Provider value={value}>{children}</FarmerDataContext.Provider>;
}

export function useFarmerData() {
  const context = useContext(FarmerDataContext);

  if (!context) {
    throw new Error("useFarmerData must be used within FarmerDataProvider.");
  }

  return context;
}
