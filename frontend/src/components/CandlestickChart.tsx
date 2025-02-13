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

    if (!data || data.length === 0) return null;

    // Максимальный объём для нормализации оси Z
    const maxVolume = Math.max(...data.map(candle => candle.volume));

    // Границы графика по оси Y (как заданы в normalizeY)
    const graphMinY = 0.1;
    const graphMaxY = 4.9;
    const minBodyHeight = 2;

    return (
      <group>
        {data.slice(-144).map((candle, index, slicedData) => {
          // Определяем тип свечи: бычья или медвежья
          const isBullish = candle.close >= candle.open;
          const color = isBullish ? "#32CD32" : "#ff4f4f";

          // Нормализованные цены
          const normOpen = normalizeY(candle.open);
          const normClose = normalizeY(candle.close);
          const normHigh = normalizeY(candle.high);
          const normLow = normalizeY(candle.low);

          // Для отрисовки тела свечи не будем использовать среднее значение.
          // Для бычьей свечи нижняя граница = normOpen, верхняя = normClose.
          // Если высота меньше minBodyHeight, то расширяем тело вверх, при этом не выходим за graphMaxY.
          // Для медвежьей свечи верхняя граница = normOpen, нижняя = normClose.
          // Если высота меньше minBodyHeight, то расширяем тело вниз, при этом не выходим за graphMinY.
          let bodyBottom: number, bodyTop: number;
          if (isBullish) {
            bodyBottom = normOpen;
            bodyTop = normClose;
            if (bodyTop - bodyBottom < minBodyHeight) {
              // Расширяем тело вверх
              bodyTop = bodyBottom + minBodyHeight;
              if (bodyTop > graphMaxY) {
                // Если получившийся верх выходит за пределы графика, сдвигаем тело вниз
                bodyTop = graphMaxY;
                bodyBottom = graphMaxY - minBodyHeight;
              }
            }
          } else {
            // Для медвежьей свечи верх = normOpen, ниж = normClose
            bodyTop = normOpen;
            bodyBottom = normClose;
            if (bodyTop - bodyBottom < minBodyHeight) {
              // Расширяем тело вниз
              bodyBottom = bodyTop - minBodyHeight;
              if (bodyBottom < graphMinY) {
                // Если нижняя граница выходит за пределы графика, сдвигаем тело вверх
                bodyBottom = graphMinY;
                bodyTop = graphMinY + minBodyHeight;
              }
            }
          }

          // Для BoxGeometry в Three.js позиция задаётся центром.
          // Вычисляем центр тела свечи как (bodyBottom + bodyTop) / 2
          const bodyHeight = bodyTop - bodyBottom;
          const bodyY = bodyBottom + bodyHeight / 2;

          // Для фитиля (тени) используем нормализованные максимумы и минимумы
          const wickHeight = normHigh - normLow;
          const wickY = normLow + wickHeight / 2;

          // По оси X для объёма и оси Z для времени используем функции нормализации
          const posX = normalizeZ(candle.volume, maxVolume);
          const posZ = normalizeX(index, slicedData.length);

          // Расстояние между свечами по оси Z
          const spacing = 5 / (slicedData.length - 1);
          // Ширина свечи уменьшена, чтобы не слипались
          const candleWidth = spacing * 0.52;

          return (
            <group key={index}>
              {/* Тело свечи */}
              <mesh position={[posX, bodyY, posZ]}>
                <boxGeometry args={[candleWidth, bodyHeight, candleWidth]} />
                <meshStandardMaterial
                  color={color}
                  transparent={mode === "Both"}
                  opacity={mode === "Both" ? 0.5 : 1}
                />
              </mesh>
              {/* Фитиль (тень) свечи */}
              <mesh position={[posX, wickY, posZ]}>
                <boxGeometry
                  args={[candleWidth * 0.25, wickHeight, candleWidth * 0.25]}
                />
                <meshStandardMaterial
                  color={color}
                  transparent={mode === "Both"}
                  opacity={mode === "Both" ? 0.5 : 1}
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