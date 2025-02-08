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

  console.log(scene.position, scene.scale, viewport.height, viewport.width);

  useEffect(() => {
    console.log("viewport changed", viewport);
  }, [viewport]);

  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);

  const normalizeX = useCallback(
    (index: number, length: number) => {
      return (index / (length - 1)) * 10 - 5; // Растягиваем на диапазон [-5, 5]
    },
    [viewport.width],
  );

  const normalizeY = useCallback(
    (value: number) => {
      const graphHeight = 5; // Берем полную высоту куба
      const paddedMin = minPrice; // Убираем padding, чтобы жестко вписать в куб
      const paddedMax = maxPrice; // Используем реальные границы

      // Нормализуем значения в диапазон от 0 до graphHeight
      return ((value - paddedMin) / (paddedMax - paddedMin)) * graphHeight;
    },
    [minPrice, maxPrice, viewport.height],
  );
  useEffect(() => {
    console.log("Normalized minY:", normalizeY(minPrice));
    console.log("Normalized maxY:", normalizeY(maxPrice));
  }, [minPrice, maxPrice, normalizeY]);

  const normalizeZ = useCallback((volume: number, maxVolume: number) => {
    return (volume / maxVolume) * 2 - 1; // Сжимаем в диапазон [-1, 1]
  }, []);

  const denormalizeX = useCallback((sceneValue: number, length: number) => {
    return ((sceneValue + 5) / 10) * (length - 1);
  }, []);

  const denormalizeY = useCallback(
    (sceneValue: number) => {
      const graphHeight = 5;
      return (sceneValue / graphHeight) * (maxPrice - minPrice) + minPrice;
    },
    [minPrice, maxPrice],
  );

  useEffect(() => {
    console.log("Min line Y:", normalizeY(minPrice));
    console.log("Max line Y:", normalizeY(maxPrice));
  }, [normalizeY, minPrice, maxPrice]);

  const denormalizeZ = useCallback((sceneValue: number, maxVolume: number) => {
    return (sceneValue / 5) * maxVolume; // 5 — это масштаб из normalizeZ
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
    [
      normalizeX,
      normalizeY,
      normalizeZ,
      denormalizeX,
      denormalizeY,
      denormalizeZ,
    ],
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
