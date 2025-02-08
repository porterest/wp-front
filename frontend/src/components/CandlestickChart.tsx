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

        const normalizedOpen = normalizeY(candle.open);
        const normalizedClose = normalizeY(candle.close);
        const normalizedHigh = normalizeY(candle.high);
        const normalizedLow = normalizeY(candle.low);

        const bodyHeight = Math.abs(normalizedClose - normalizedOpen);
        const bodyY = (normalizedOpen + normalizedClose) / 2;

        const shadowHeight = normalizedHigh - normalizedLow;
        const shadowY = (normalizedHigh + normalizedLow) / 2;

        const positionZ = normalizeX(index, slicedData.length); // Используем 144 вместо 5
        const positionX = normalizeZ(candle.volume, maxVolume);

        return (
          <group key={index}>
            {/* Тело свечи */}
            <mesh position={[positionX, bodyY, positionZ]}>
              <boxGeometry args={[0.2, bodyHeight, 0.2]} /> {/* Уменьшаем ширину свечи */}
              <meshStandardMaterial color={color} transparent={mode === "Both"} opacity={getOpacity()} />
            </mesh>

            {/* Тень свечи */}
            <mesh position={[positionX, shadowY, positionZ]}>
              <boxGeometry args={[0.05, shadowHeight, 0.05]} /> {/* Тень тоже уменьшаем */}
              <meshStandardMaterial color={color} transparent={mode === "Both"} opacity={getOpacity()} />
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
