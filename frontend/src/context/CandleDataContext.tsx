// import React, { createContext, useState, useEffect, ReactNode } from "react";
// import { fetchCandles } from "../services/api";
// import { CandleData, CandleDataContextValue } from "../types/candles";
// import { PairOption } from "../types/pair";
//
// export const CandleDataContext = createContext<CandleDataContextValue | undefined>(undefined);
//
// export const CandleDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//   const [data, setData] = useState<CandleData[]>([]); // Данные свечей
//   const [selectedPair, setSelectedPair] = useState<PairOption | null>(null); // По умолчанию
//   const [isLoading, setIsLoading] = useState<boolean>(false); // Состояние загрузки
//   const [error, setError] = useState<string | null>(null); // Ошибки при загрузке
//
//   // Функция для загрузки данных свечей
//   const fetchData = async (pairId: string) => {
//     setIsLoading(true);
//     setError(null);
//
//     try {
//       const candles = await fetchCandles(pairId); // Запрос данных с использованием функции fetchCandles
//       setData(candles);
//     } catch (err) {
//       console.error(`Ошибка при загрузке данных для пары ${pairId}:`, err);
//       setError((err as Error).message || "Не удалось загрузить данные свечей");
//     } finally {
//       setIsLoading(false);
//     }
//   };
//
//   // Эффект для загрузки данных при изменении выбранной пары
//   useEffect(() => {
//     if (selectedPair?.value) {
//       fetchData(selectedPair.value); // Используем value из PairOption
//     }
//   }, [selectedPair]);
//
//   return (
//     <CandleDataContext.Provider
//       value={{
//         data,
//         selectedPair,
//         setSymbol: setSelectedPair, // Функция для изменения выбранной пары
//         isLoading,
//         error,
//       }}
//     >
//       {children}
//     </CandleDataContext.Provider>
//   );
// };
