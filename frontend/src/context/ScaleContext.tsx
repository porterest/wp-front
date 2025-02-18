import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useThree } from "@react-three/fiber";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";

const ScaleContext = createContext<ScaleFunctions | null>(null);

export const ScaleProvider: React.FC<{
  children: React.ReactNode;
  data: CandleData[];
}> = ({ children, data }) => {
  const { viewport, scene } = useThree();

  console.log(
    "Scene position:",
    scene.position,
    "Scene scale:",
    scene.scale,
    "Viewport:",
    viewport
  );

  const maxVolume = Math.max(...data.map(candle => candle.volume));


  useEffect(() => {
    console.log("Viewport changed:", viewport);
  }, [viewport]);

  // Вычисляем минимальную и максимальную цену
  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);

  console.log("Min price:", minPrice, "Max price:", maxPrice, "Price range:");

  /**
   * Нормализация по оси Y (цены)
   * Отображает диапазон [minPrice, maxPrice] → [0.5, 4.5] (с запасом сверху и снизу).
   */
  const normalizeY = useCallback(
    (value: number) => {
      const graphHeight = 5;
      const margin = 0.5; // Минимальный отступ сверху и снизу
      const priceRange = maxPrice - minPrice || 1; // Чтобы не делить на 0
      console.log("priceRange")
      console.log(maxPrice - minPrice)
      console.log("value")
      console.log(value)
      console.log("(value - minPrice) / priceRange")
      console.log((value - minPrice) / priceRange)
      console.log("graphHeight");
      console.log(graphHeight);
      console.log("graphHeight - 2 * margin")
      console.log(graphHeight - 2 * margin)
      console.log("margin")
      console.log(margin)
      console.log("margin + ((value - minPrice) / priceRange) * (graphHeight - 2 * margin)")
      console.log(margin + ((value - minPrice) / priceRange) * (graphHeight - 2 * margin))
      return margin + ((value - minPrice) / priceRange) * (graphHeight - 2 * margin);
    },
    [minPrice, maxPrice]
  );

  const denormalizeY = useCallback(
    (sceneValue: number) => {
      const graphHeight = 5;
      const margin = 0.5;
      const priceRange = maxPrice - minPrice || 1;
      return ((sceneValue - margin) / (graphHeight - 2 * margin)) * priceRange + minPrice;
    },
    [minPrice, maxPrice]
  );

  /**
   * Нормализация по оси X (временная ось, индекс свечи)
   * Индексы [0, length - 1] → [0, 5]
   */
  const normalizeX = useCallback(
    (index: number, length: number) => {
      console.log("index, length");
      console.log(index, length);
      console.log("index / (length - 1)*5");
      console.log(index / (length - 1)*5);
      return length > 1 ? (index / (length - 1)) * 5 : 0; // Если 1 свеча — ставим 0
    },
    []
  );

  const denormalizeX = useCallback((sceneValue: number, length: number) => {
    return length > 1 ? (sceneValue / 5) * (length - 1) : 0;
  }, []);

  /**
   * Нормализация по оси Z (объём)
   * Значения [0, maxVolume] → [0, 5]
   */
  const normalizeZ = useCallback((volume: number) => {
    return maxVolume > 0 ? (volume / maxVolume) * 5 : 0; // Чтобы не делить на 0
  }, []);

  const denormalizeZ = useCallback((sceneValue: number) => {
    return maxVolume > 0 ? (sceneValue / 5) * maxVolume : 0;
  }, []);

  const scaleFunctions = useMemo(
    () => ({
      normalizeX,
      normalizeY,
      normalizeZ,
      denormalizeX,
      denormalizeY,
      denormalizeZ,
    }),
    [normalizeX, normalizeY, normalizeZ, denormalizeX, denormalizeY, denormalizeZ]
  );

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
