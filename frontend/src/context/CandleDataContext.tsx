import React, { createContext, useState, useEffect, ReactNode } from "react";
import { getCandlestickData10m } from "../services/apiService";

interface CandleData {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

interface CandleDataContextValue {
  data: CandleData[];
  selectedPair: string;
  setSymbol: (symbol: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const CandleDataContext = createContext<
  CandleDataContextValue | undefined
>(undefined);

export const CandleDataProvider: React.FC<{ children: ReactNode }> = ({
                                                                        children,
                                                                      }) => {
  const [data, setData] = useState<CandleData[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>("BTCUSDT");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Функция для загрузки данных свечей
  const fetchData = async (symbol: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const candles = await getCandlestickData10m(symbol);
      if (!candles || candles.length === 0) {
        throw new Error("No data received from API.");
      }
      console.log(`Updating context data for ${symbol}:`, candles);
      setData(candles);
    } catch (err) {
      console.error(`Error fetching data for ${symbol}:`, err);
      setError((err as Error).message || "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  // Эффект для загрузки данных при изменении selectedPair
  useEffect(() => {
    if (selectedPair) {
      fetchData("BTCUSDT");
      // fetchData(selectedPair);
    }
  }, [selectedPair]);

  return (
    <CandleDataContext.Provider
      value={{
        data,
        selectedPair,
        setSymbol: setSelectedPair,
        isLoading,
        error,
      }}
    >
      {children}
    </CandleDataContext.Provider>
  );
};
