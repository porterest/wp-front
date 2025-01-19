import React, { createContext, useContext, useState } from "react";
import { fetchCandles } from "../services/api";
import { PairOption } from "../types/pair";
import { CandleData } from "../types/candles";

interface PrefetchedData {
  pairs?: PairOption[]; // Пары для выбора
  time?: number; // Время блока
  candles?: CandleData[]; // Данные свечей
  selectedPair?: PairOption | null; // Выбранная пара
  isLoading?: boolean; // Состояние загрузки
  error?: string | null; // Ошибка при загрузке
}

interface DataPrefetchContextValue {
  data: PrefetchedData;
  setData: React.Dispatch<React.SetStateAction<PrefetchedData>>;
  fetchCandlesForPair: (pairId: string) => void; // Функция для загрузки свечей
  setSelectedPair: (pair: PairOption | null) => void; // Функция для выбора пары
}

const DataPrefetchContext = createContext<DataPrefetchContextValue | undefined>(undefined);

export const DataPrefetchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PrefetchedData>({
    pairs: [],
    candles: [],
    selectedPair: null,
    isLoading: false,
    error: null,
  });

  // Функция для загрузки свечей
  const fetchCandlesForPair = async (pairId: string) => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const candles = await fetchCandles(pairId);
      setData((prev) => ({ ...prev, candles, isLoading: false }));
    } catch (err) {
      console.error(`Ошибка при загрузке данных для пары ${pairId}:`, err);
      setData((prev) => ({
        ...prev,
        error: (err as Error).message || "Не удалось загрузить данные свечей",
        isLoading: false,
      }));
    }
  };

  // Обновление выбранной пары и загрузка соответствующих свечей
  const setSelectedPair = (pair: PairOption | null) => {
    setData((prev) => ({ ...prev, selectedPair: pair }));
    if (pair?.value) {
      fetchCandlesForPair(pair.value);
    }
  };

  return (
    <DataPrefetchContext.Provider
      value={{
        data,
        setData,
        fetchCandlesForPair,
        setSelectedPair,
      }}
    >
      {children}
    </DataPrefetchContext.Provider>
  );
};

export const useDataPrefetch = () => {
  const context = useContext(DataPrefetchContext);
  if (!context) {
    throw new Error("useDataPrefetch must be used within a DataPrefetchProvider");
  }
  return context;
};
