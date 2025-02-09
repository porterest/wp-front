import React, { memo } from "react";
import { useScale } from "../context/ScaleContext";
import { CandleData } from "../types/candles";

interface CandlestickChartProps {
  data: CandleData[];
  mode: "Candles" | "Axes" | "Both";
}

const CandlestickChart: React.FC<CandlestickChartProps> = memo(({ data, mode }) => {
  const { normalizeX, normalizeY, normalizeZ } = useScale();

  if (!data || data.length === 0) {
    return null;
  }

  // Находим максимальный объём для нормализации по оси X (объём)
  const maxVolume = Math.max(...data.map((candle) => candle.volume));

  const getColor = (isBullish: boolean): string => {
    return isBullish ? "#32CD32" : "#ff4f4f";
  };

  const getOpacity = (): number => {
    return mode === "Both" ? 0.5 : 1;
  };

  return (
    <group>
      {data.slice(-144).map((candle, index, slicedData) => {
        const isBullish = candle.close > candle.open;
        const color = getColor(isBullish);

        // Нормализуем значения цены (Y-координата)
        const normalizedOpen = normalizeY(candle.open);
        const normalizedClose = normalizeY(candle.close);
        const normalizedHigh = normalizeY(candle.high);
        const normalizedLow = normalizeY(candle.low);

        const bodyHeight = Math.abs(normalizedClose - normalizedOpen);
        const bodyY = (normalizedOpen + normalizedClose) / 2;

        const shadowHeight = normalizedHigh - normalizedLow;
        const shadowY = (normalizedHigh + normalizedLow) / 2;

        // Позиция по оси Z (например, время) рассчитывается через normalizeX
        const positionZ = normalizeX(index, slicedData.length);
        // Позиция по оси X (например, объём) рассчитывается через normalizeZ
        const positionX = normalizeZ(candle.volume, maxVolume);

        // Вычисляем расстояние между центрами свечей вдоль оси Z.
        // Функция normalizeX в вашем ScaleContext возвращает координаты в диапазоне [0, 5].
        // Таким образом, расстояние между соседними свечами (слот) равно:
        const spacing = 5 / (slicedData.length - 1);
        // Задаём ширину свечи как 80% от доступного слота – оставляем 20% зазор:
        const candleWidth = spacing * 0.8;

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

            {/* Тень свечи (фитиль) */}
            <mesh position={[positionX, shadowY, positionZ]}>
              <boxGeometry args={[candleWidth * 0.25, shadowHeight, candleWidth * 0.25]} />
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
