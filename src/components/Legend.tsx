import React from "react";

interface LegendProps {
    items: { color: string; label: string }[]; // Массив элементов легенды
}

const Legend: React.FC<LegendProps> = ({ items }) => {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-around", // Элементы равномерно распределены
                alignItems: "center",
                position: "absolute",
                top: "10px", // Расположение сверху
                left: "0", // Начало с левого края
                right: "0", // Растяжение до правого края
                width: "100%", // Занимает всю ширину
                background: "rgba(0, 0, 0, 0.8)", // Полупрозрачный фон
                padding: "10px", // Отступы внутри блока
                borderRadius: "12px", // Скруглённые углы
                zIndex: 10, // Поверх остальных элементов
                color: "white",
                fontSize: "14px",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
            }}
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px", // Отступ между точкой и текстом
                    }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: item.color,
                            borderRadius: "50%",
                        }}
                    ></span>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
};



export default Legend;
