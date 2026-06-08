import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    authService.bootstrap();
    setUser(authService.getCurrentUser());
    setIsReady(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isReady,
      login: async (credentials) => {
        const nextUser = authService.login(credentials);
        setUser(nextUser);
        return nextUser;
      },
      register: async (payload) => {
        const nextUser = authService.register(payload);
        setUser(nextUser);
        return nextUser;
      },
      logout: () => {
        authService.logout();
        setUser(null);
      },
      updateCurrentUser: async (updates) => {
        const nextUser = authService.updateCurrentUser(updates);
        setUser(nextUser);
        return nextUser;
      },
    }),
    [user, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
