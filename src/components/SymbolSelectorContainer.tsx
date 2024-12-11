import React from "react";
import SymbolSelector from "./SymbolSelector";

interface SymbolSelectorContainerProps {
    onSwitchMode: (mode: "Axes" | "Candles" | "Both") => void;
    onAxisModeChange: (axis: "X" | "Y") => void;
}

const SymbolSelectorContainer: React.FC<SymbolSelectorContainerProps> = ({
                                                                             onSwitchMode,
                                                                             onAxisModeChange,
                                                                         }) => (
    <div
        style={{
            position: "absolute",
            top: "100px",
            right: "20px",
            zIndex: 10,
        }}
    >
        <SymbolSelector onSwitchMode={onSwitchMode} onAxisModeChange={onAxisModeChange} />
    </div>
);

export default SymbolSelectorContainer;
