import React, { memo } from "react";
import { useScale } from "../context/ScaleContext";
import { CandleData } from "../types/candles";

interface CandlestickChartProps {
  data: CandleData[];
  mode: "Candles" | "Axes" | "Both";
}

const CandlestickChart: React.FC<CandlestickChartProps> = memo(
  ({ data, mode }) => {
    const { normalizeX, normalizeY, normalizeZ } = useScale();

    if (!data || data.length === 0) {
      return null;
    }

    // Находим максимальный объём для нормализации (ось Z)
    const maxVolume = Math.max(...data.map((candle) => candle.volume));

    const getColor = (isBullish: boolean): string =>
      isBullish ? "#32CD32" : "#ff4f4f";

    const getOpacity = (): number => (mode === "Both" ? 0.5 : 1);

    return (
      <group>
        {data.slice(-144).map((candle, index, slicedData) => {
          const isBullish = candle.close >= candle.open;
          const color = getColor(isBullish);

          // Нормализуем цены по оси Y (результат в диапазоне [0.5, 4.5])
          const normalizedOpen = normalizeY(candle.open);
          const normalizedClose = normalizeY(candle.close);
          const normalizedHigh = normalizeY(candle.high);
          const normalizedLow = normalizeY(candle.low);

          const rawBodyHeight = Math.abs(normalizedClose - normalizedOpen);
          const minBodyHeight = 2; //
          let bodyHeight, bodyY;
          if (rawBodyHeight < minBodyHeight) {
            bodyHeight = minBodyHeight;
            // Если open ≈ close, центруем тело вокруг среднего значения
            bodyY = (normalizedOpen + normalizedClose) / 2;
          } else {
            bodyHeight = rawBodyHeight;
            bodyY = (normalizedOpen + normalizedClose) / 2;
          }

          const shadowHeight = normalizedHigh - normalizedLow;
          const shadowY = (normalizedHigh + normalizedLow) / 2;

          // Позиция по оси X для объёма (через normalizeZ)
          const positionX = normalizeZ(candle.volume, maxVolume);
          // Позиция по оси Z для временной оси (через normalizeX)
          const positionZ = normalizeX(index, slicedData.length);

          // Вычисляем расстояние между свечами вдоль оси Z (при диапазоне [0,5])
          const spacing = 5 / (slicedData.length - 1);
          // Уменьшаем ширину свечи, чтобы они не слипались: берем 30% от spacing
          const candleWidth = spacing * 0.65;

          return (
            <group key={index}>
              {/* Тело свечи */}
              <mesh position={[positionX, bodyY, positionZ]}>
                <boxGeometry args={[candleWidth, bodyHeight, candleWidth]} />
                <meshStandardMaterial
                  color={color}
                  transparent={mode === "Both"}
                  opacity={getOpacity()}
                />
              </mesh>
              {/* Фитиль (тень) свечи */}
              <mesh position={[positionX, shadowY, positionZ]}>
                <boxGeometry
                  args={[candleWidth * 0.25, shadowHeight, candleWidth * 0.25]}
                />
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
  },
  (prevProps, nextProps) =>
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    prevProps.mode === nextProps.mode
);

export default CandlestickChart;
