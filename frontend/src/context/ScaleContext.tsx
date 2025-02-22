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

  console.log("data:", data);

  // Вычисляем минимальную и максимальную цену из свечей
  const minPrice = useMemo(() => Math.min(...data.map(d => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map(d => d.high)), [data]);

  console.log("Min price:", minPrice, "Max price:", maxPrice);

  /**
   * Нормализация по оси Y (цены).
   * Теперь мы вычисляем фракцию: (value - minPrice) / (maxPrice - minPrice),
   * затем ограничиваем её до 1 и масштабируем в диапазон 0–5.
   */
  const normalizeY = useCallback(
    (value: number) => {
      const range = maxPrice - minPrice;
      const fraction = range > 0 ? (value - minPrice) / range : 0;
      const clampedFraction = Math.min(Math.max(fraction, 0), 1);
      return clampedFraction * 5;
    },
    [minPrice, maxPrice]
  );

  const denormalizeY = useCallback(
    (sceneValue: number) => {
      const range = maxPrice - minPrice;
      return range > 0 ? (sceneValue / 5) * range + minPrice : minPrice;
    },
    [minPrice, maxPrice]
  );

  /**
   * Нормализация по оси X.
   * Здесь предполагается, что value находится в диапазоне [0, maxIndex] – где maxIndex
   * соответствует максимуму для этой оси. Мы вычисляем фракцию value / maxIndex, ограничиваем её до 1,
   * и умножаем на 5.
   */
  const normalizeX = useCallback(
    (value: number, maxIndex: number) => {
      const fraction = maxIndex > 0 ? value / maxIndex : 0;
      const clampedFraction = Math.min(Math.max(fraction, 0), 1);
      return clampedFraction * 5;
    },
    []
  );

  const denormalizeX = useCallback(
    (sceneValue: number, maxIndex: number) => {
      return maxIndex > 0 ? (sceneValue / 5) * maxIndex : 0;
    },
    []
  );

  /**
   * Нормализация по оси Z (объём).
   * Значения [0, maxVolume] → [0, 5]
   */
  const normalizeZ = useCallback(
    (volume: number) => {
      const fraction = maxVolume > 0 ? volume / maxVolume : 0;
      const clampedFraction = Math.min(Math.max(fraction, 0), 1);
      return clampedFraction * 5;
    },
    [maxVolume]
  );

  const denormalizeZ = useCallback(
    (sceneValue: number) => {
      return maxVolume > 0 ? (sceneValue / 5) * maxVolume : 0;
    },
    [maxVolume]
  );

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
