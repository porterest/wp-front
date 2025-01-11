import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";

const ScaleContext = createContext<ScaleFunctions | null>(null);

export const ScaleProvider: React.FC<{ children: React.ReactNode; data: CandleData[] }> = ({ children, data }) => {
  const { viewport, scene } = useThree();

  console.log(scene.position, scene.scale, viewport.height, viewport.width);

  useEffect(() => {
    console.log('viewport changed', viewport);
  }, [viewport]);

  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);

  const normalizeX = useCallback((index: number, length: number) => {
    return ((index / length) * viewport.width) - viewport.width / 8;
  }, [viewport.width]);

  const normalizeY = useCallback(
    (value: number) => {
      const graphHeight = 5; // Берем полную высоту куба
      const paddedMin = minPrice; // Убираем padding, чтобы жестко вписать в куб
      const paddedMax = maxPrice; // Используем реальные границы

      // Нормализуем значения в диапазон от 0 до graphHeight
      return ((value - paddedMin) / (paddedMax - paddedMin)) * graphHeight;
    },
    [minPrice, maxPrice, viewport.height]
  );
  useEffect(() => {
    console.log('Normalized minY:', normalizeY(minPrice));
    console.log('Normalized maxY:', normalizeY(maxPrice));
  }, [minPrice, maxPrice, normalizeY]);


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
  console.log("Viewport height:", viewport.height);
  console.log("Min price:", minPrice);
  console.log("Max price:", maxPrice);

  useEffect(() => {
    const minY = normalizeY(minPrice);
    const maxY = normalizeY(maxPrice);

    console.log(`Min line Y: ${minY}`);
    console.log(`Max line Y: ${maxY}`);
  });
  data?.forEach((candle, index) => {
    console.log(`Candle ${index}: Open Y: ${normalizeY(candle.open)}, Close Y: ${normalizeY(candle.close)}`);
  });


  const normalizeZ = useCallback((volume: number, maxVolume: number) => {
    return (volume / maxVolume) * 5;
  }, []);

  const denormalizeX = useCallback((sceneValue: number, length: number) => {
    return ((sceneValue + viewport.width / 8) / viewport.width) * (length - 1);
  }, [viewport.width]);

  const denormalizeY = useCallback(
    (sceneValue: number) => {
      const graphHeight = viewport.height * 0.8;
      return (sceneValue / graphHeight) * (maxPrice - minPrice) + minPrice;
    },
    [viewport.height, minPrice, maxPrice]
  );
  useEffect(() => {
    console.log('Min line Y:', normalizeY(minPrice));
    console.log('Max line Y:', normalizeY(maxPrice));
  }, [normalizeY, minPrice, maxPrice]);


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
