import React, { createContext, useContext, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";


const ScaleContext = createContext<ScaleFunctions | null>(null);

export const ScaleProvider: React.FC<{ children: React.ReactNode; data: CandleData[] }> = ({ children, data }) => {
  const { viewport } = useThree();

  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);
  // const maxVolume = useMemo(() => Math.max(...data.map((d) => d.volume)), [data]);

  // const normalizeX = (index: number, length: number) =>
  //   (index / (length - 1)) * viewport.width - viewport.width / 2;
  const normalizeX = (index: number, length: number) =>
    ((index / length) * viewport.width) - viewport.width / 2;

  // const normalizeY = (value: number) =>
  //   ((value - minPrice) / (maxPrice - minPrice)) * viewport.height - viewport.height / 2;
  const normalizeY = (value: number) =>
    ((value - minPrice) / (maxPrice - minPrice)) * viewport.height * 0.4; // Добавьте коэффициент


  // const normalizeZ = (volume: number, maxVolume: number) =>
  //   (volume / maxVolume) * viewport.width;
  const normalizeZ = (volume: number, maxVolume: number) =>
    (volume / maxVolume) * 5; // Уменьшите масштаб


  const denormalizeX = (sceneValue: number, length: number) =>
    ((sceneValue + viewport.width / 2) / viewport.width) * (length - 1);

  const denormalizeY = (sceneValue: number) =>
    ((sceneValue + viewport.height / 2) / viewport.height) * (maxPrice - minPrice) + minPrice;

  const denormalizeZ = (sceneValue: number, maxVolume: number) =>
    (sceneValue / viewport.width) * maxVolume;



  return (
    <ScaleContext.Provider
      value={{ normalizeX, normalizeY, normalizeZ, denormalizeX, denormalizeY, denormalizeZ }}
    >
      {children}
    </ScaleContext.Provider>
  );
};

export const useScale = () => {
  const context = useContext(ScaleContext);
  if (!context) {
    throw new Error("useScale must be used within a ScaleProvider");
  }
  return context;
};
