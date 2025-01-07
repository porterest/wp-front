import React from "react";
import { useScale } from "../context/ScaleContext";
import { CandleData } from "../types/candles";

interface CandlestickChartProps {
  data: CandleData[];
  mode: "Candles" | "Axes" | "Both"; // Режим отображения
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, mode }) => {
  const { normalizeX, normalizeY, normalizeZ } = useScale();

  if (!data || data.length === 0) {
    console.warn("No data to render in CandlestickChart!");
    return null;
  }

  // Определяем минимумы и максимумы для нормализации
  const maxVolume = Math.max(...data.map((candle) => candle.volume));

  // Определяем цвета свечей
  const getColor = (isBullish: boolean): string => {
    return isBullish ? "#32CD32" : "#ff4f4f"; // Зеленый для роста, красный для падения
  };

  const getOpacity = (): number => {
    return mode === "Both" ? 0.5 : 1;
  };

  return (
    <group>
      {/* Рендерим каждую свечу */}
      {data.map((candle, index) => {
        const isBullish = candle.close > candle.open;
        const color = getColor(isBullish);

        // Нормализация по осям
        const normalizedOpen = normalizeY(candle.open);
        const normalizedClose = normalizeY(candle.close);
        const normalizedHigh = normalizeY(candle.high);
        const normalizedLow = normalizeY(candle.low);

        const bodyHeight = Math.abs(normalizedClose - normalizedOpen);
        const bodyY = (normalizedOpen + normalizedClose) / 2;

        const shadowHeight = normalizedHigh - normalizedLow;
        const shadowY = (normalizedHigh + normalizedLow) / 2;

        const positionX = normalizeX(index, data.length);
        const positionZ = normalizeZ(candle.volume, maxVolume);

        return (
          <group key={index}>
            {/* Тело свечи */}
            <mesh position={[positionX, bodyY, positionZ]}>
              <boxGeometry args={[0.5, bodyHeight, 0.5]} />
              <meshStandardMaterial
                color={color}
                transparent={mode === "Both"}
                opacity={getOpacity()}
              />
            </mesh>

            {/* Тень свечи */}
            <mesh position={[positionX, shadowY, positionZ]}>
              <boxGeometry args={[0.1, shadowHeight, 0.1]} />
              <meshStandardMaterial
                color={color}
                transparent={mode === "Both"}
                opacity={getOpacity()}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export default CandlestickChart;
