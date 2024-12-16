import React from "react";
import SymbolSelector from "./SymbolSelector";

interface SymbolSelectorContainerProps {
  onSwitchMode: (mode: "Axes" | "Candles" | "Both") => void;
  onAxisModeChange: (axis: "X" | "Y") => void;
  onSymbolChange: (pair: string) => void;
}

const SymbolSelectorContainer: React.FC<SymbolSelectorContainerProps> = ({
  onSwitchMode,
  onAxisModeChange,
  onSymbolChange,
}) => (
  <div className="absolute top-[100px] right-[20px] z-10">
    <SymbolSelector
      onSwitchMode={onSwitchMode}
      onAxisModeChange={onAxisModeChange}
      onSymbolChange={onSymbolChange}
    />
  </div>
);

export default SymbolSelectorContainer;
