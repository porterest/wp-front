import { useState } from "react";

const useGameModes = () => {
  const [currentMode, setCurrentMode] = useState(1);
  const [axisMode, setAxisMode] = useState<"Y" | "Z">("Y");

  const handleSwitchMode = (mode: "Axes" | "Candles" | "Both") => {
    setCurrentMode(mode === "Axes" ? 1 : mode === "Candles" ? 2 : 3);
  };

  return {
    currentMode,
    axisMode,
    setAxisMode,
    handleSwitchMode,
  };
};

export default useGameModes;
