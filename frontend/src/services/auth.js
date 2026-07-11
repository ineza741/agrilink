import { clearBackendSession, isBackendSessionActive, phase1BackendService } from "./phase1Backend";

const STORAGE_KEYS = {
  users: "agri-feed-users",
  currentUser: "agri-feed-current-user",
};

const DEFAULT_REGION = "Gatenga Sector, Kicukiro District";
const DEFAULT_CREATED_AT = "2026-06-18T08:00:00.000Z";

function normalizeRegion(region) {
  if (!region || region === "Unassigned Region") return DEFAULT_REGION;
  if (region === "Northern Highlands") return DEFAULT_REGION;
  return region;
}

const defaultUsers = [
  {
    id: "user-admin-1",
    name: "AgriFeed Admin",
    email: "admin@agrisupport.rw",
    password: "Admin@123",
    role: "admin",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "user-farmer-1",
    name: "Rodrigue Farmer",
    email: "farmer@agrisupport.rw",
    password: "Farmer@123",
    role: "farmer",
    contact: "+250 788 555 101",
    region: "Gatenga Sector, Kicukiro District",
    experienceLevel: "Intermediate",
    createdAt: "2026-06-02T09:30:00.000Z",
  },
  {
    id: "user-officer-1",
    name: "Extension Officer",
    email: "officer@agrisupport.rw",
    password: "Officer@123",
    role: "admin",
    contact: "+250 788 400 210",
    region: "Gatenga Sector, Kicukiro District",
    experienceLevel: "Extension Officer",
    createdAt: "2026-06-03T08:15:00.000Z",
  },
  {
    id: "user-farmer-2",
    name: "Aline Mukamana",
    email: "aline@agrifeed.com",
    password: "Farmer123!",
    role: "farmer",
    contact: "+250 788 410 220",
    region: "Nyamata Sector, Bugesera District",
    experienceLevel: "Advanced",
    createdAt: "2026-06-14T07:40:00.000Z",
  },
  {
    id: "user-farmer-3",
    name: "Claude Ndayisaba",
    email: "claude@agrifeed.com",
    password: "Farmer123!",
    role: "farmer",
    contact: "+250 788 502 118",
    region: "Musanze District",
    experienceLevel: "Intermediate",
    createdAt: "2026-06-15T10:15:00.000Z",
  },
  {
    id: "user-farmer-4",
    name: "Jeanne Uwase",
    email: "jeanne@agrifeed.com",
    password: "Farmer123!",
    role: "farmer",
    contact: "+250 788 630 447",
    region: "Rwamagana District",
    experienceLevel: "Beginner",
    createdAt: "2026-06-16T13:20:00.000Z",
  },
  {
    id: "user-farmer-5",
    name: "Eric Habimana",
    email: "eric@agrifeed.com",
    password: "Farmer123!",
    role: "farmer",
    contact: "+250 788 700 984",
    region: "Huye District",
    experienceLevel: "Advanced",
    createdAt: "2026-06-17T08:25:00.000Z",
  },
];

function normalizeUserRecord(user) {
  return {
    ...user,
    region: normalizeRegion(user.region),
    createdAt:
      user.createdAt && !Number.isNaN(new Date(user.createdAt).getTime())
        ? user.createdAt
        : DEFAULT_CREATED_AT,
    experienceLevel: user.experienceLevel || "Intermediate",
  };
}

function mergeDemoUsers(savedUsers = []) {
  const nextUsers = [...savedUsers];

  defaultUsers.forEach((demoUser) => {
    const existingIndex = nextUsers.findIndex((user) => user.id === demoUser.id);
    if (existingIndex === -1) {
      nextUsers.push(demoUser);
      return;
    }

    nextUsers[existingIndex] = normalizeUserRecord({
      ...demoUser,
      ...nextUsers[existingIndex],
    });
  });

  return nextUsers.map(normalizeUserRecord);
}

function readUsers() {
  const saved = localStorage.getItem(STORAGE_KEYS.users);
  if (saved) {
    const mergedUsers = mergeDemoUsers(JSON.parse(saved));
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(mergedUsers));
    return mergedUsers;
  }

  const seededUsers = mergeDemoUsers(defaultUsers);
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(seededUsers));
  return seededUsers;
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function upsertUserRecord(userRecord) {
  const users = readUsers();
  const existingIndex = users.findIndex((user) => user.id === userRecord.id);
  const nextUsers = [...users];

  if (existingIndex === -1) {
    nextUsers.push(normalizeUserRecord(userRecord));
  } else {
    nextUsers[existingIndex] = normalizeUserRecord({
      ...nextUsers[existingIndex],
      ...userRecord,
    });
  }

  saveUsers(nextUsers);
}

function createUserRecord(payload) {
  return normalizeUserRecord({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    region: DEFAULT_REGION,
    ...payload,
  });
}

function persistCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  upsertUserRecord(user);
  return user;
}

export const authService = {
  bootstrap() {
    return readUsers();
  },

  getCurrentUser() {
    const saved = localStorage.getItem(STORAGE_KEYS.currentUser);
    return saved ? JSON.parse(saved) : null;
  },

  async refreshCurrentUser() {
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      return null;
    }

    if (!isBackendSessionActive()) {
      return currentUser;
    }

    try {
      const backendUser = await phase1BackendService.auth.me();
      return persistCurrentUser(backendUser);
    } catch {
      return currentUser;
    }
  },

  async login({ email, password }) {
    try {
      const backendUser = await phase1BackendService.auth.login({ email, password });
      return persistCurrentUser({
        ...backendUser,
        password,
      });
    } catch (error) {
      const users = readUsers();
      const user = users.find(
        (item) =>
          item.email.toLowerCase() === email.toLowerCase() &&
          item.password === password
      );

      if (!user) {
        throw new Error(error?.message || "Invalid email or password.");
      }

      clearBackendSession();
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
      return user;
    }
  },

  async register(payload) {
    if (payload.role === "MarketOfficer") {
      const result = await phase1BackendService.auth.registerMarketOfficer(payload);
      if (result?.pendingApproval) {
        return { pendingApproval: true, message: result.message };
      }
      return result;
    }

    try {
      const backendUser = await phase1BackendService.auth.register(payload);
      return persistCurrentUser({
        ...backendUser,
        password: payload.password,
      });
    } catch {
      clearBackendSession();
      const users = readUsers();
      const exists = users.some(
        (item) => item.email.toLowerCase() === payload.email.toLowerCase()
      );

      if (exists) {
        throw new Error("An account with this email already exists.");
      }

      const user = createUserRecord(payload);
      const nextUsers = [...users, user];
      saveUsers(nextUsers);
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
      return user;
    }
  },

  createUser(payload) {
    const users = readUsers();
    const exists = users.some(
      (item) => item.email.toLowerCase() === payload.email.toLowerCase()
    );

    if (exists) {
      throw new Error("An account with this email already exists.");
    }

    const user = createUserRecord(payload);
    saveUsers([...users, user]);
    return user;
  },

  logout() {
    clearBackendSession();
    localStorage.removeItem(STORAGE_KEYS.currentUser);
  },

  updateCurrentUser(updates) {
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      throw new Error("No active user session found.");
    }

    const users = readUsers();
    const nextUser = {
      ...currentUser,
      ...updates,
    };

    const nextUsers = users.map((user) =>
      user.id === currentUser.id
        ? {
            ...user,
            ...updates,
          }
        : user
    );

    saveUsers(nextUsers);
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
    return nextUser;
  },
};
