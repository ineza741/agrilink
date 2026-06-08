const STORAGE_KEYS = {
  users: "agri-feed-users",
  currentUser: "agri-feed-current-user",
};

const defaultUsers = [
  {
    id: "user-admin-1",
    name: "AgriFeed Admin",
    email: "admin@agrifeed.com",
    password: "Admin123!",
    role: "admin",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "user-farmer-1",
    name: "Rodrigue Farmer",
    email: "farmer@agrifeed.com",
    password: "Farmer123!",
    role: "farmer",
    contact: "+250 788 555 101",
    region: "Northern Highlands",
    experienceLevel: "Intermediate",
    createdAt: "2026-06-02T09:30:00.000Z",
  },
];

function readUsers() {
  const saved = localStorage.getItem(STORAGE_KEYS.users);
  if (saved) {
    return JSON.parse(saved);
  }

  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function createUserRecord(payload) {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };
}

export const authService = {
  bootstrap() {
    return readUsers();
  },

  getCurrentUser() {
    const saved = localStorage.getItem(STORAGE_KEYS.currentUser);
    return saved ? JSON.parse(saved) : null;
  },

  login({ email, password }) {
    const users = readUsers();
    const user = users.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() &&
        item.password === password
    );

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    return user;
  },

  register(payload) {
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
