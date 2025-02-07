import React, { useCallback, useMemo, useEffect, useState } from "react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import Select, { StylesConfig } from "react-select";
import { PairOption } from "../types/pair";

interface SymbolSelectorProps {
  onSwitchMode: (mode: "Candles" | "Axes" | "Both") => void;
  onAxisModeChange: (axis: "X" | "Y") => void;
  onSymbolChange: (pair: PairOption) => void;
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({
                                                         onSwitchMode,
                                                         onAxisModeChange,
                                                         onSymbolChange,
                                                       }) => {
  const { data, setData } = useDataPrefetch();
  const pairs = data.pairs || []; // Пары из контекста
  const [globalMode, setGlobalMode] = useState<"Candles" | "Axes" | "Both">("Axes");
  const [axisMode, setAxisMode] = useState<"X" | "Y">("X");
  const [selectedPair, setSelectedPair] = useState<PairOption | null>(null);

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
    (mode: "X" | "Y") => {
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
    // Если список загружен и ни одна пара ещё не выбрана
    if (pairs.length > 0 && !selectedPair) {
      // Ищем пару с нужным label (например, "DD/TON")
      const defaultPair = pairs.find(pair => pair.label === "DD/TON");
      if (defaultPair) {
        setSelectedPair(defaultPair);
        setData(prev => ({ ...prev, selectedPair: defaultPair }));
        onSymbolChange(defaultPair);
      }
    }
  }, [pairs, selectedPair, setData, onSymbolChange]);

  return (
    <div className="relative w-[180px] p-2 rounded-lg bg-[rgba(0,255,255,0.2)] text-white shadow-md">
      {/* Выпадающий список для выбора валютной пары */}
      <div>
        {pairs.length === 0 ? (
          <div className="text-gray-400 text-sm">Загрузка...</div>
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
          onClick={() => handleAxisModeChange("X")}
          className={`px-3 py-2 w-[48%] rounded-md text-sm font-bold ${
            axisMode === "X"
              ? "bg-cyan-400 text-white"
              : "bg-[rgba(0,255,255,0.2)] text-white"
          }`}
        >
          Z-axis
        </button>
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
      </div>
    </div>
  );
};

export default SymbolSelector;
