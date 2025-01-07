import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthManager } from "../services/AuthManager";
import {
  setLogoutFunction,
  setRefreshTokenFunction,
} from "../services/apiClient";
import { ProofData } from "../types/tonProof";

interface User {
  id: string;
  name: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  loginWithProof: (proofData: ProofData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getCurrentUser: () => User | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                        children,
                                                                      }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authManager = new AuthManager();

  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem("authToken");

      if (accessToken) {
        try {
          const currentUser = await authManager.getUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch {
          console.warn("[AuthContext]: Invalid token, logging out.");
          await handleLogout();
        }
      }
    };

    setRefreshTokenFunction(async () => {
      const newAccessToken = await authManager.refreshToken();
      localStorage.setItem("authToken", newAccessToken);
      return newAccessToken; // Возвращаем строку
    });

    setLogoutFunction(async () => {
      await handleLogout();
    });

    initializeAuth();
  }, []);

  const handleLogout = async () => {
    await authManager.logout();
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setIsAuthenticated(false);
  };

  const loginWithProof = async (proofData: ProofData) => {
    try {
      const { accessToken, refreshToken, user: loggedInUser } =
        await authManager.loginWithProof(proofData);

      // Сохраняем токены
      localStorage.setItem("authToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      setUser(loggedInUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("[AuthContext]: Login with proof failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await handleLogout();
    } catch (error) {
      console.error("[AuthContext]: Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authManager.getUser();
      setUser(updatedUser);
    } catch (error) {
      console.error("[AuthContext]: Failed to refresh user:", error);
    }
  };

  const getCurrentUser = (): User | null => user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loginWithProof,
        logout,
        refreshUser,
        getCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
