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

    // Находим максимальный объём для нормализации (ось X для объёма)
    const maxVolume = Math.max(...data.map((candle) => candle.volume));

    const getColor = (isBullish: boolean): string =>
      isBullish ? "#32CD32" : "#ff4f4f";

    const getOpacity = (): number => (mode === "Both" ? 0.5 : 1);

    return (
      <group>
        {data.slice(-144).map((candle, index, slicedData) => {
          const isBullish = candle.close >= candle.open;
          const color = getColor(isBullish);

          // Нормализуем цены по оси Y (диапазон [0,5])
          const normalizedOpen = normalizeY(candle.open);
          const normalizedClose = normalizeY(candle.close);
          const normalizedHigh = normalizeY(candle.high);
          const normalizedLow = normalizeY(candle.low);

          const rawBodyHeight = Math.abs(normalizedClose - normalizedOpen);
          let bodyHeight, bodyY;
          if (rawBodyHeight < 0.01) {
            // Если open ≈ close (doji), задаём тело свечи равным 20% от полной высоты (shadow)
            bodyHeight = (normalizedHigh - normalizedLow) * 0.2;
            bodyY = normalizedLow + (normalizedHigh - normalizedLow) / 2;
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

          // Вычисляем расстояние между свечами вдоль оси Z (в диапазоне [0, 5])
          const spacing = 5 / (slicedData.length - 1);
          // Задаём ширину свечи как 50% от расстояния между свечами
          const candleWidth = spacing * 0.5;

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
