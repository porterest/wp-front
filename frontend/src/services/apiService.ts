const API_BASE_URL = "https://api.binance.com/api/v3/klines";

// Тип для одной свечи, возвращаемой Binance API
interface RawCandle {
  0: number; // Open time
  1: string; // Open price
  2: string; // High price
  3: string; // Low price
  4: string; // Close price
  5: string; // Volume
  6: number; // Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

// Тип для свечи, агрегированной в 10m
interface AggregatedCandle {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

// Функция для запроса данных с Binance API
export const fetchCandlestickData = async (
  symbol: string,
  interval: string = "5m",
  limit: number = 100,
): Promise<RawCandle[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch candlestick data:", error);
    return [];
  }
};

// Функция для агрегации данных в интервал 10m
export const aggregateTo10m = (rawData: RawCandle[]): AggregatedCandle[] => {
  const aggregatedData: AggregatedCandle[] = [];

  for (let i = 0; i < rawData.length; i += 2) {
    if (i + 1 < rawData.length) {
      const candle1 = rawData[i];
      const candle2 = rawData[i + 1];

      aggregatedData.push({
        open: parseFloat(candle1[1]),
        close: parseFloat(candle2[4]),
        high: Math.max(parseFloat(candle1[2]), parseFloat(candle2[2])),
        low: Math.min(parseFloat(candle1[3]), parseFloat(candle2[3])),
        volume: parseFloat(candle1[5]) + parseFloat(candle2[5]),
        timestamp: candle1[0], // Время открытия первой свечи
      });
    }
  }
  // console.log(aggregatedData);
  return aggregatedData;
};

// Функция для получения агрегированных данных 10m
export const getCandlestickData10m = async (
  symbol: string,
): Promise<AggregatedCandle[]> => {
  const rawData = await fetchCandlestickData(symbol, "5m");
  console.log(rawData);
  return aggregateTo10m(rawData);
};
