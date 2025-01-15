import React, { useContext, useEffect, useState } from "react";
import Select from "react-select";
import { CandleDataContext } from "../context/CandleDataContext";
import { PairResponse } from "../types/apiTypes";
import { getPairs } from "../services/api";
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
  const context = useContext(CandleDataContext);
  const [globalMode, setGlobalMode] = useState<"Candles" | "Axes" | "Both">("Axes");
  const [axisMode, setAxisMode] = useState<"X" | "Y">("X");
  const [options, setOptions] = useState<PairOption[]>([]);
  const [selectedPair, setSelectedPair] = useState<PairOption | null>(null);

  if (!context) {
    throw new Error("CandleDataContext must be used within a CandleDataProvider");
  }

  const { setSymbol } = context;

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const data: PairResponse[] = await getPairs();
        const fetchedOptions = data.map((pair: PairResponse) => ({
          value: pair.pair_id,
          label: pair.name,
        }));
        setOptions(fetchedOptions);
      } catch (error) {
        console.error("Ошибка при получении пар:", error);
      }
    };

    fetchPairs();
  }, []);

  const handlePairChange = (selectedOption: PairOption | null) => {
    setSelectedPair(selectedOption);
    console.log(selectedPair);
    if (selectedOption) {
      setSymbol(selectedOption);
      onSymbolChange(selectedOption);
    }
  };

  const handleGlobalModeSwitch = () => {
    const nextMode =
      globalMode === "Axes"
        ? "Candles"
        : globalMode === "Candles"
          ? "Both"
          : "Axes";
    setGlobalMode(nextMode);
    onSwitchMode(nextMode);
  };

  const handleAxisModeChange = (mode: "X" | "Y") => {
    setAxisMode(mode);
    onAxisModeChange(mode);
  };

  return (
    <div className="relative w-[180px] p-2 rounded-lg bg-[rgba(0,255,255,0.2)] text-white shadow-md">
      {/* Выпадающий список для выбора валютной пары */}
      <div>
        <Select
          options={options}
          onChange={handlePairChange}
          placeholder="Select Pair"
          styles={{
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
          }}
        />
      </div>

      {/* Кнопки переключения режима */}
      <button
        onClick={handleGlobalModeSwitch}
        className="mt-2 px-3 py-2 w-full bg-cyan-400 text-white font-bold text-sm rounded-md shadow-lg hover:bg-cyan-500 transition"
      >
        Switch mode ({globalMode})
      </button>
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
