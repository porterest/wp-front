import React from "react";
import Legend from "./Legend";

interface LegendContainerProps {
    items: { color: string; label: string }[];
}

const LegendContainer: React.FC<LegendContainerProps> = ({ items }) => (
    <div
        style={{
            position: "relative",
            top: "10px",
            left: "57%",
            transform: "translateX(-50%)",
            zIndex: 10,
        }}
    >
        <Legend items={items} />
    </div>
);

export default LegendContainer;
