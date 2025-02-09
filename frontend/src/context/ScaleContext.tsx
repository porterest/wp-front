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

  useEffect(() => {
    console.log("Viewport changed:", viewport);
  }, [viewport]);

  // Вычисляем минимальную и максимальную цену
  const minPrice = useMemo(() => Math.min(...data.map((d) => d.low)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.high)), [data]);

  /**
   * Нормализация по оси Y с отступами:
   * Результат будет в диапазоне [margin, 5 - margin] (например, [0.5, 4.5]),
   * что гарантирует, что свечи не выйдут за пределы графика.
   */
  const normalizeY = useCallback(
    (value: number) => {
      const graphHeight = 5;
      const margin = 0.5; // отступ сверху и снизу
      return margin + (((value - minPrice) / (maxPrice - minPrice)) * (graphHeight - 2 * margin));
    },
    [minPrice, maxPrice]
  );

  const denormalizeY = useCallback(
    (sceneValue: number) => {
      const graphHeight = 5;
      const margin = 0.5;
      return ((sceneValue - margin) / (graphHeight - 2 * margin)) * (maxPrice - minPrice) + minPrice;
    },
    [minPrice, maxPrice]
  );

  /**
   * Нормализация по оси X (временная ось):
   * Преобразуем индекс свечи (от 0 до length-1) в значение в диапазоне [0, 5].
   */
  const normalizeX = useCallback(
    (index: number, length: number) => {
      const range = 5;
      return (index / (length - 1)) * range;
    },
    []
  );

  const denormalizeX = useCallback((sceneValue: number, length: number) => {
    const range = 5;
    return (sceneValue / range) * (length - 1);
  }, []);

  /**
   * Нормализация по оси Z (объём):
   * Преобразуем объём (от 0 до maxVolume) в значение в диапазоне [0, 5].
   */
  const normalizeZ = useCallback((volume: number, maxVolume: number) => {
    return (volume / maxVolume) * 5;
  }, []);

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
