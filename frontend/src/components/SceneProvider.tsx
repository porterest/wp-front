import React, { createContext, useContext } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const SceneContext = createContext<THREE.Scene | null>(null);

export const SceneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { scene } = useThree(); // Используем сцену из контекста `useThree`
  return <SceneContext.Provider value={scene}>{children}</SceneContext.Provider>;
};

export const useScene = () => {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error("useScene must be used within a SceneProvider");
  }
  return context;
};
