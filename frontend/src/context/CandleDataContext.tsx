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
  setSymbol: (symbol: string) => void;
}

export const CandleDataContext = createContext<
  CandleDataContextValue | undefined
>(undefined);

export const CandleDataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<CandleData[]>([]);
  const [symbol, setSymbol] = useState<string>("BTCUSDT");

  useEffect(() => {
    const fetchData = async () => {
      const candles = await getCandlestickData10m(symbol);
      console.log("Updating context data with candles:", candles);

      setData(candles);
    };

    fetchData();

    const interval = setInterval(
      () => {
        fetchData();
      },
      10 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <CandleDataContext.Provider value={{ data, setSymbol }}>
      {children}
    </CandleDataContext.Provider>
  );
};
