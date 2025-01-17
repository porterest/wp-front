import React, { memo } from "react";
import { useScale } from "../context/ScaleContext";
import { CandleData } from "../types/candles";

interface CandlestickChartProps {
  data: CandleData[];
  mode: "Candles" | "Axes" | "Both"; // Режим отображения
}

const CandlestickChart: React.FC<CandlestickChartProps> = memo(({ data, mode }) => {
  const { normalizeX, normalizeY, normalizeZ } = useScale();

  if (!data || data.length === 0) {
    return null;
  }

  // Сортируем данные по предполагаемой временной шкале (если её нет, просто оставляем порядок)
  const sortedData = [...data].sort((a, b) => (a.volume - b.volume)); // Замените сортировку на логику по времени, если появится поле.

  // Определяем максимальный объем для нормализации Z-координаты
  const maxVolume = Math.max(...sortedData.map((candle) => candle.volume));

  const getColor = (isBullish: boolean): string => {
    return isBullish ? "#32CD32" : "#ff4f4f"; // Зеленый для роста, красный для падения
  };

  const getOpacity = (): number => {
    return mode === "Both" ? 0.5 : 1;
  };

  return (
    <group>
      {sortedData.map((candle, index) => {
        const isBullish = candle.close > candle.open;
        const color = getColor(isBullish);

        // Нормализация значений
        const normalizedOpen = normalizeY(candle.open);
        const normalizedClose = normalizeY(candle.close);
        const normalizedHigh = normalizeY(candle.high);
        const normalizedLow = normalizeY(candle.low);

        const bodyHeight = Math.abs(normalizedClose - normalizedOpen);
        const bodyY = (normalizedOpen + normalizedClose) / 2;

        const shadowHeight = normalizedHigh - normalizedLow;
        const shadowY = (normalizedHigh + normalizedLow) / 2;

        // Используем индекс из отсортированных данных для нормализации оси времени
        const positionX = normalizeX(index, sortedData.length);
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
}, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    prevProps.mode === nextProps.mode
  );
});

export default CandlestickChart;
