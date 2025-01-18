import React, { createContext, useContext } from "react";
import { ProofData } from "../types/tonProof";
import { verifyPayload } from "../services/api";
// import { useTonConnectUI } from "@tonconnect/ui-react";

interface AuthContextValue {
  loginWithProof: (proofData: ProofData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                        children,
                                                                      }) => {
  // const tonConnectUI = useTonConnectUI()[0];

  const logout = async () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    // await tonConnectUI.disconnect();
  };

  const loginWithProof = async (proofData: ProofData) => {
    try {
      const { accessToken, refreshToken } = await verifyPayload(proofData);
      localStorage.setItem("authToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    } catch (error) {
      console.error("[AuthContext]: Login with proof failed:", error);
      throw error;
    }
  };


  return (
    <AuthContext.Provider
      value={{
        loginWithProof,
        logout,
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
