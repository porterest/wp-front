import React, { useCallback, useMemo, useEffect, useState } from "react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import Select, { StylesConfig } from "react-select";
import { PairOption } from "../types/pair";
import { fetchLastVectors } from "../services/api"; // Импорт функции запроса

interface SymbolSelectorProps {
  onSwitchMode: (mode: "Candles" | "Axes" | "Both") => void;
  onAxisModeChange: (axis: "Y" | "Z") => void;
  onSymbolChange: (pair: PairOption) => void;
  onHistoricalFetched: (vectors: Array<[number, number]>) => void;
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({
                                                         onSwitchMode,
                                                         onAxisModeChange,
                                                         onSymbolChange,
                                                         onHistoricalFetched,
                                                       }) => {
  const { data, setData } = useDataPrefetch();
  const pairs = data.pairs || []; // Пары из контекста
  const [globalMode, setGlobalMode] = useState<"Candles" | "Axes" | "Both">("Axes");
  const [axisMode, setAxisMode] = useState<"Y" | "Z">("Y");
  const [selectedPair, setSelectedPair] = useState<PairOption | null>(null);

  // --- Состояния для работы с историческими векторами ---
  const [showHistoricalInput, setShowHistoricalInput] = useState<boolean>(false);
  const [historicalCount, setHistoricalCount] = useState<number>(5);
  const [isFetchingHistorical, setIsFetchingHistorical] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Стили для компонента Select
  const selectStyles: StylesConfig<PairOption, false> = useMemo(
    () => ({
      control: (base) => ({
        ...base,
        background: "rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(0, 255, 255, 0.6)",
        borderRadius: "8px",
        color: "white",
        fontSize: "12px",
      }),
      menu: (base) => ({
        ...base,
        background: "rgba(0, 0, 0, 0.9)",
        color: "white",
        borderRadius: "8px",
      }),
      option: (base, { isFocused, isSelected }) => ({
        ...base,
        background: isSelected
          ? "rgba(128, 0, 128, 0.5)"
          : isFocused
            ? "rgba(128, 0, 128, 0.3)"
            : "transparent",
        color: "white",
        cursor: "pointer",
      }),
      singleValue: (base) => ({
        ...base,
        color: "white",
      }),
    }),
    []
  );

  // Обработчик изменения выбранной пары
  const handlePairChange = useCallback(
    (selectedOption: PairOption | null) => {
      setSelectedPair(selectedOption); // Обновляем локальное состояние
      if (selectedOption) {
        setData((prev) => ({ ...prev, selectedPair: selectedOption })); // Обновляем в контексте
        onSymbolChange(selectedOption); // Вызываем callback
      }
    },
    [setData, onSymbolChange]
  );

  // Обработчик переключения глобального режима
  const handleGlobalModeSwitch = useCallback(() => {
    const nextMode =
      globalMode === "Axes"
        ? "Candles"
        : globalMode === "Candles"
          ? "Both"
          : "Axes";
    setGlobalMode(nextMode);
    onSwitchMode(nextMode);
  }, [globalMode, onSwitchMode]);

  // Обработчик изменения оси
  const handleAxisModeChange = useCallback(
    (mode: "Y" | "Z") => {
      setAxisMode(mode);
      onAxisModeChange(mode);
    },
    [onAxisModeChange]
  );

  // Логирование выбранных пар для отладки
  useEffect(() => {
    console.log("Selected pairs from context:", pairs);
  }, [pairs]);

  // Эффект для синхронизации локального состояния selectedPair с данными из контекста
  useEffect(() => {
    if (data.selectedPair) {
      setSelectedPair(data.selectedPair);
    }
  }, [data.selectedPair]);

  // Эффект для автоматического выбора нужной пары при загрузке списка
  useEffect(() => {
    if (pairs.length > 0 && !selectedPair) {
      const defaultPair = pairs.find((pair) => pair.label === "DD/TON");
      if (defaultPair) {
        setSelectedPair(defaultPair);
        setData((prev) => ({ ...prev, selectedPair: defaultPair }));
        onSymbolChange(defaultPair);
      }
    }
  }, [pairs, selectedPair, setData, onSymbolChange]);

  // --- Обработчик загрузки исторических векторов ---
  const handleFetchHistoricalVectors = useCallback(async () => {
    if (!selectedPair) {
      alert("Please select a currency pair first.");
      return;
    }
    setIsFetchingHistorical(true);
    setFetchError(null);
    try {
      const vectors = await fetchLastVectors(selectedPair.value, historicalCount);
      console.log("vectors", vectors);
      setIsFetchingHistorical(false);
      onHistoricalFetched(vectors);
    } catch (error) {
      console.error("Error fetching historical vectors:", error);
      setFetchError("Error loading historical data.");
      setIsFetchingHistorical(false);
    }
  }, [selectedPair, historicalCount, onHistoricalFetched]);

  return (
    <div className="relative w-[180px] p-2 rounded-lg bg-[rgba(0,255,255,0.2)] text-white shadow-md">
      {/* Выпадающий список для выбора валютной пары */}
      <div>
        {pairs.length === 0 ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : (
          <Select
            options={pairs}
            value={selectedPair}
            onChange={handlePairChange}
            placeholder="Select Pair"
            styles={selectStyles}
          />
        )}
      </div>

      {/* Кнопка переключения глобального режима */}
      <button
        onClick={handleGlobalModeSwitch}
        className="mt-2 px-3 py-2 w-full bg-cyan-400 text-white font-bold text-sm rounded-md shadow-lg hover:bg-cyan-500 transition"
      >
        Switch mode ({globalMode})
      </button>

      {/* Кнопки переключения осей */}
      <div className="mt-2 flex justify-between">
        <button
          onClick={() => handleAxisModeChange("Y")}
          className={`px-3 py-2 w-[48%] rounded-md text-sm font-bold ${
            axisMode === "Y"
              ? "bg-cyan-400 text-white"
              : "bg-[rgba(0,255,255,0.2)] text-white"
          }`}
        >
          Y-axis
        </button>
        <button
          onClick={() => handleAxisModeChange("Z")}
          className={`px-3 py-2 w-[48%] rounded-md text-sm font-bold ${
            axisMode === "Z"
              ? "bg-cyan-400 text-white"
              : "bg-[rgba(0,255,255,0.2)] text-white"
          }`}
        >
          Z-axis
        </button>
      </div>

      {/* --- Блок для загрузки исторических векторов --- */}
      <div className="mt-2">
        <button
          onClick={() => {
            setShowHistoricalInput((prev) => {
              if (prev) {
                // При скрытии очищаем исторические данные
                onHistoricalFetched([]);
              }
              return !prev;
            });
          }}
          className="px-2 py-1 w-full bg-cyan-400 text-white font-bold text-sm rounded-md shadow-lg hover:bg-cyan-500 transition"
        >
          {showHistoricalInput
            ? "Hide Historical Data"
            : "Show Historical Data"}
        </button>
        {showHistoricalInput && (
          <div className="mt-2">
            <input
              type="number"
              value={historicalCount}
              onChange={(e) => setHistoricalCount(Number(e.target.value))}
              className="w-full p-1 rounded-md bg-gray-200 text-black"
              min={1}
            />
            <button
              onClick={handleFetchHistoricalVectors}
              className="mt-2 px-3 py-2 w-full bg-purple-500 text-white font-bold text-sm rounded-md shadow-lg hover:bg-purple-600 transition"
            >
              {isFetchingHistorical ? "Loading..." : "Load"}
            </button>
            {fetchError && (
              <div className="mt-1 text-red-500 text-sm">{fetchError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SymbolSelector;
