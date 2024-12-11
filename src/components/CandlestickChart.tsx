import React from "react";

interface CandleData {
    open: number; // Цена открытия
    close: number; // Цена закрытия
    high: number; // Максимальная цена
    low: number; // Минимальная цена
    volume: number; // Объем
    timestamp: number; // Временная метка
}

interface CandlestickChartProps {
    data: CandleData[];
    graphDimensions: { x: number; y: number; z: number }; // Размеры графика
    mode: "Candles" | "Axes" | "Both"; // Режим отображения
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, graphDimensions, mode }) => {
    if (!data || data.length === 0) {
        console.warn("No data to render in CandlestickChart!");
        return null;
    }

    const { x: graphWidth, y: graphHeight, z: graphDepth } = graphDimensions;

    // Определяем минимумы и максимумы для нормализации
    const minPrice = Math.min(...data.map((candle) => candle.low));
    const maxPrice = Math.max(...data.map((candle) => candle.high));
    const priceRange = maxPrice - minPrice;

    const maxVolume = Math.max(...data.map((candle) => candle.volume));

    // Коэффициенты масштабирования
    const SCALE_Y = graphHeight / priceRange; // Высота графика по оси Y
    const SCALE_X = graphWidth / data.length; // Ширина графика равномерно делится между свечами

    // Определяем цвета свечей в зависимости от режима
    const getColor = (isBullish: boolean): string => {
        return isBullish ? "#32CD32" : "#ff4f4f"; // Зеленый для роста, красный для падения
    };

    // Прозрачность свечей в режиме "Both"
    const getOpacity = (): number => {
        return mode === "Both" ? 0.5 : 1; // 50% прозрачности для "Both", 100% для остальных режимов
    };

    return (
        <group>
            {/* Рендерим каждую свечу */}
            {data.map((candle, index) => {
                const isBullish = candle.close > candle.open; // Определяем, является ли свеча растущей
                const color = getColor(isBullish); // Получаем цвет свечи

                // Масштабируем значения по оси Y
                const normalizedOpen = (candle.open - minPrice) * SCALE_Y;
                const normalizedClose = (candle.close - minPrice) * SCALE_Y;
                const normalizedHigh = (candle.high - minPrice) * SCALE_Y;
                const normalizedLow = (candle.low - minPrice) * SCALE_Y;

                // Высота тела свечи
                const bodyHeight = Math.abs(normalizedClose - normalizedOpen);
                // Положение центра тела свечи
                const bodyY = Math.min(normalizedOpen, normalizedClose) + bodyHeight / 2;

                // Высота теней свечи
                const shadowHeight = normalizedHigh - normalizedLow;
                // Положение центра тени свечи
                const shadowY = normalizedLow + shadowHeight / 2;

                // Нормализуем объем по оси Z
                const normalizedVolume = candle.volume / maxVolume; // Пропорция относительно максимального объема
                const positionX = index * SCALE_X / 2; // Расстояние между свечами
                const positionZ = normalizedVolume * graphDepth; // Приводим объем к глубине графика

                return (
                    <group key={index}>
                        {/* Тело свечи */}
                        <mesh position={[positionX, bodyY, positionZ]}>
                            <boxGeometry args={[SCALE_X * 0.8, bodyHeight, SCALE_X * 0.8]} />
                            <meshStandardMaterial
                                color={color}
                                transparent={mode === "Both"} // Включаем прозрачность для "Both"
                                opacity={getOpacity()} // Прозрачность 50% в режиме "Both"
                            />
                        </mesh>

                        {/* Тень свечи */}
                        <mesh position={[positionX, shadowY, positionZ]}>
                            <boxGeometry args={[SCALE_X * 0.2, shadowHeight, SCALE_X * 0.2]} />
                            <meshStandardMaterial
                                color={color}
                                transparent={mode === "Both"} // Включаем прозрачность для "Both"
                                opacity={getOpacity()} // Прозрачность 50% в режиме "Both"
                            />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
};

export default CandlestickChart;
