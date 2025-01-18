import React, { useCallback, useMemo } from "react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import Select, { StylesConfig } from "react-select";
import { PairOption } from "../types/pair";

interface SymbolSelectorProps {
  onSymbolChange: (pair: PairOption) => void;
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({ onSymbolChange }) => {
  const { data } = useDataPrefetch(); // Получаем объект data из контекста
  const pairs = data.pairs || []; // Извлекаем пары или используем пустой массив

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

  const handlePairChange = useCallback(
    (selectedOption: PairOption | null) => {
      if (selectedOption) {
        onSymbolChange(selectedOption);
      }
    },
    [onSymbolChange]
  );

  return (
    <div className="relative w-[180px] p-2 rounded-lg bg-[rgba(0,255,255,0.2)] text-white shadow-md">
      <div>
        {pairs.length === 0 ? (
          <div className="text-gray-400 text-sm">Загрузка...</div>
        ) : (
          <Select
            options={pairs}
            onChange={handlePairChange}
            placeholder="Select Pair"
            styles={selectStyles}
          />
        )}
      </div>
    </div>
  );
};

export default SymbolSelector;
