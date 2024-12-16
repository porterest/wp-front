import React from "react";

interface LegendProps {
  items: { color: string; label: string }[]; // Массив элементов легенды
}

const Legend: React.FC<LegendProps> = ({ items }) => {
  return (
    <div className="absolute top-[10px] left-0 right-0 w-full bg-black bg-opacity-80 text-white text-sm flex justify-around items-center p-2 rounded-xl z-10 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          ></span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default Legend;
