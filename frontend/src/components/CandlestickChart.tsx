import React, { memo } from "react";
import { useScale } from "../context/ScaleContext";
import { CandleData } from "../types/candles";

interface CandlestickChartProps {
  data: CandleData[];
  mode: "Candles" | "Axes" | "Both"; // Режим отображения
}

const CandlestickChart: React.FC<CandlestickChartProps> = memo(({ data, mode }) => {
  const { normalizeX, normalizeY, normalizeZ } = useScale();
  console.log("CandlestickChart rerendered");

  if (!data || data.length === 0) {
    console.warn("No data to render in CandlestickChart!");
    return null;
  }

  // Определяем максимальный объем для нормализации Z-координаты
  const maxVolume = Math.max(...data.map((candle) => candle.volume));

  // Определяем цвет свечи
  const getColor = (isBullish: boolean): string => {
    return isBullish ? "#32CD32" : "#ff4f4f"; // Зеленый для роста, красный для падения
  };

  // Устанавливаем прозрачность в зависимости от режима
  const getOpacity = (): number => {
    return mode === "Both" ? 0.5 : 1;
  };

  return (
    <group>
      {data.map((candle, index) => {
        console.log("Rendering candle", {
          index,
          open: candle.open,
          close: candle.close,
          high: candle.high,
          low: candle.low,
          volume: candle.volume,
        });

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

        console.log("Normalized values", {
          index,
          normalizedX: positionX,
          normalizedY: { open: normalizedOpen, close: normalizedClose },
          normalizedZ: positionZ,
        });

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
  // Оптимизация: проверяем, изменились ли данные или режим
  return (
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    prevProps.mode === nextProps.mode
  );
});

export default CandlestickChart;
