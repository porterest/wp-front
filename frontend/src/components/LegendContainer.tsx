import React from "react";
import Legend from "./Legend";

interface LegendContainerProps {
  items: { color: string; label: string }[];
}

const LegendContainer: React.FC<LegendContainerProps> = ({ items }) => (
  <div className="relative top-[10px] left-[57%] transform -translate-x-1/2 z-10">
    <Legend items={items} />
  </div>
);

export default LegendContainer;
