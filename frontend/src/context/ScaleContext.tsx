import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";

const ScaleContext = createContext<ScaleFunctions | null>(null);

export const ScaleProvider: React.FC<{ children: React.ReactNode; data: CandleData[] }> = ({ children, data }) => {
  const { viewport } = useThree();

  useEffect(() => {
    console.log('viewport changed', viewport);
  }, [viewport]);

  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);

  const normalizeX = useCallback((index: number, length: number) => {
    return ((index / length) * viewport.width) - viewport.width / 2;
  }, [viewport.width]);

  const normalizeY = useCallback((value: number) => {
    return ((value - minPrice) / (maxPrice - minPrice)) * viewport.height - viewport.height / 2;
  }, [minPrice, maxPrice, viewport.height]);

  data.forEach((candle, index) => {
    const normalizedOpen = normalizeY(candle.open);
    const normalizedClose = normalizeY(candle.close);
    const normalizedHigh = normalizeY(candle.high);
    const normalizedLow = normalizeY(candle.low);

    console.log(`Candle ${index}:`);
    console.log(`  Open Y: ${normalizedOpen}`);
    console.log(`  Close Y: ${normalizedClose}`);
    console.log(`  High Y: ${normalizedHigh}`);
    console.log(`  Low Y: ${normalizedLow}`);
  });


  const normalizeZ = useCallback((volume: number, maxVolume: number) => {
    return (volume / maxVolume) * 5;
  }, []);

  const denormalizeX = useCallback((sceneValue: number, length: number) => {
    return ((sceneValue + viewport.width / 2) / viewport.width) * (length - 1);
  }, [viewport.width]);

  const denormalizeY = useCallback((sceneValue: number) => {
    return ((sceneValue + viewport.height / 2) / viewport.height) * (maxPrice - minPrice) + minPrice;
  }, [viewport.height, minPrice, maxPrice]);

  const denormalizeZ = useCallback((sceneValue: number, maxVolume: number) => {
    return (sceneValue / viewport.width) * maxVolume;
  }, [viewport.width]);

  const scaleFunctions = useMemo(() => ({
    normalizeX,
    normalizeY,
    normalizeZ,
    denormalizeX,
    denormalizeY,
    denormalizeZ,
  }), [normalizeX, normalizeY, normalizeZ, denormalizeX, denormalizeY, denormalizeZ]);

  return (
    <ScaleContext.Provider value={scaleFunctions}>
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




// import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
// import { useThree } from "@react-three/fiber";
// import { ScaleFunctions } from "../types/scale";
// import { CandleData } from "../types/candles";
//
//
// const ScaleContext = createContext<ScaleFunctions | null>(null);
//
// export const ScaleProvider: React.FC<{ children: React.ReactNode; data: CandleData[] }> = ({ children, data }) => {
//   const { viewport } = useThree();
//
//   useEffect(() => {
//     console.log('viewport changed', viewport);
//   }, [viewport]);
//
//   const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
//   const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);
//   // const maxVolume = useMemo(() => Math.max(...data.map((d) => d.volume)), [data]);
//
//   // const normalizeX = (index: number, length: number) =>
//   //   (index / (length - 1)) * viewport.width - viewport.width / 2;
//   const normalizeX = useCallback((index: number, length: number) => {
//     return ((index / length) * viewport.width) - viewport.width / 2;
//   }, [viewport.width]);
//
//   const normalizeY = useCallback((value: number) => {
//     return ((value - minPrice) / (maxPrice - minPrice)) * viewport.height * 0.4;
//   }, [minPrice, maxPrice, viewport.height]);
//
//   const normalizeZ = useCallback((volume: number, maxVolume: number) => {
//     return (volume / maxVolume) * 5;
//   }, []);
//
//   const denormalizeX = useCallback((sceneValue: number, length: number) => {
//     return ((sceneValue + viewport.width / 2) / viewport.width) * (length - 1);
//   }, [viewport.width]);
//
//   const denormalizeY = useCallback((sceneValue: number) => {
//     return ((sceneValue + viewport.height / 2) / viewport.height) * (maxPrice - minPrice) + minPrice;
//   }, [viewport.height, minPrice, maxPrice]);
//
//   const denormalizeZ = useCallback((sceneValue: number, maxVolume: number) => {
//     return (sceneValue / viewport.width) * maxVolume;
//   }, [viewport.width]);
//
//
//
//   return (
//     <ScaleContext.Provider
//       value={{ normalizeX, normalizeY, normalizeZ, denormalizeX, denormalizeY, denormalizeZ }}
//     >
//       {children}
//     </ScaleContext.Provider>
//   );
// };
//
// export const useScale = () => {
//   const context = useContext(ScaleContext);
//   if (!context) {
//     throw new Error("useScale must be used within a ScaleProvider");
//   }
//   return context;
// };
