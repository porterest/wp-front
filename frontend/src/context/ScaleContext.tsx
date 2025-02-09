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

  console.log("Scene position:", scene.position, "Scene scale:", scene.scale, "Viewport:", viewport);

  useEffect(() => {
    console.log("Viewport changed:", viewport);
  }, [viewport]);

  // Вычисляем минимальную и максимальную цену
  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);

  // Для временной оси задаём больший диапазон, чтобы свечи не слипались
  const timeAxisRange = 15; // диапазон для оси времени (X), можно менять по вкусу

  /**
   * Нормализация по оси X:
   * Преобразуем индекс свечи (от 0 до length-1) в значение в диапазоне [0, timeAxisRange].
   */
  const normalizeX = useCallback(
    (index: number, length: number) => {
      return (index / (length - 1)) * timeAxisRange;
    },
    [timeAxisRange]
  );

  /**
   * Нормализация по оси Y:
   * Преобразуем цену (от minPrice до maxPrice) в значение в диапазоне [0, 5].
   */
  const normalizeY = useCallback(
    (value: number) => {
      const graphHeight = 5;
      return ((value - minPrice) / (maxPrice - minPrice)) * graphHeight;
    },
    [minPrice, maxPrice]
  );

  useEffect(() => {
    console.log("Normalized minY:", normalizeY(minPrice));
    console.log("Normalized maxY:", normalizeY(maxPrice));
  }, [minPrice, maxPrice, normalizeY]);

  /**
   * Нормализация по оси Z (объём):
   * Преобразуем объём (от 0 до maxVolume) в значение в диапазоне [0, 5].
   */
  const normalizeZ = useCallback((volume: number, maxVolume: number) => {
    return (volume / maxVolume) * 5;
  }, []);

  /**
   * Денормализация по оси X:
   * Преобразуем значение из диапазона [0, timeAxisRange] обратно в индекс (от 0 до length-1).
   */
  const denormalizeX = useCallback((sceneValue: number, length: number) => {
    return (sceneValue / timeAxisRange) * (length - 1);
  }, [timeAxisRange]);

  /**
   * Денормализация по оси Y:
   * Преобразуем значение из диапазона [0, 5] обратно в цену (от minPrice до maxPrice).
   */
  const denormalizeY = useCallback(
    (sceneValue: number) => {
      const graphHeight = 5;
      return (sceneValue / graphHeight) * (maxPrice - minPrice) + minPrice;
    },
    [minPrice, maxPrice]
  );

  /**
   * Денормализация по оси Z:
   * Преобразуем значение из диапазона [0, 5] обратно в объём.
   */
  const denormalizeZ = useCallback((sceneValue: number, maxVolume: number) => {
    return (sceneValue / 5) * maxVolume;
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
