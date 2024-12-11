import React, { useContext, useState } from "react";
import Select from "react-select";
import { CandleDataContext } from "../context/CandleDataContext";

// Опции для выбора валютных пар
const options = [
    { value: "BTCUSDT", label: "BTC/USDT" },
    { value: "ETHUSDT", label: "ETH/USDT" },
    { value: "BNBUSDT", label: "BNB/USDT" },
    { value: "SOLUSDT", label: "SOL/USDT" },
    { value: "ADAUSDT", label: "ADA/USDT" },
];

interface SymbolSelectorProps {
    onSwitchMode: (mode: "Candles" | "Axes" | "Both") => void; // Callback для переключения режимов
    onAxisModeChange: (axis: "X" | "Y") => void; // Callback для переключения осей
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({ onSwitchMode, onAxisModeChange }) => {
    const context = useContext(CandleDataContext); // Подключаемся к контексту данных свечей
    const [globalMode, setGlobalMode] = useState<"Candles" | "Axes" | "Both">("Axes"); // Локальное состояние режима
    const [axisMode, setAxisMode] = useState<"X" | "Y">("X"); // Локальное состояние текущей оси

    // Проверяем наличие контекста
    if (!context) {
        throw new Error("CandleDataContext must be used within a CandleDataProvider");
    }

    const { setSymbol } = context; // Достаем функцию для установки символа из контекста

    // Функция переключения режима отображения графика
    const handleGlobalModeSwitch = () => {
        // Меняем текущий режим по кругу
        const nextMode = globalMode === "Axes" ? "Candles" : globalMode === "Candles" ? "Both" : "Axes";
        setGlobalMode(nextMode); // Обновляем локальное состояние
        onSwitchMode(nextMode); // Уведомляем родительский компонент о смене режима
    };

    // Функция переключения оси для ставки
    const handleAxisModeChange = (mode: "X" | "Y") => {
        setAxisMode(mode); // Обновляем локальное состояние
        onAxisModeChange(mode); // Уведомляем родительский компонент о смене оси
    };

    return (
        <div
            style={{
                position: "relative",
                width: "220px",
                padding: "10px",
                borderRadius: "12px",
                background: "rgba(0, 255, 255, 0.2)", // Полупрозрачный фон
                boxShadow: "0 4px 10px rgba(0, 255, 255, 0.2)", // Тень
                color: "white", // Цвет текста
            }}
        >
            {/* Выпадающий список для выбора символа */}
            <Select
                options={options}
                onChange={(selectedOption: any) => {
                    setSymbol(selectedOption.value); // Устанавливаем выбранный символ через контекст
                }}
                placeholder="Select Pair" // Текст по умолчанию
                styles={{
                    control: (base) => ({
                        ...base,
                        background: "rgba(0, 0, 0, 0.5)", // Полупрозрачный фон выпадающего списка
                        border: "1px solid rgba(0, 255, 255, 0.6)", // Границы
                        borderRadius: "8px", // Закругленные края
                        color: "white", // Цвет текста
                        fontSize: "14px", // Размер шрифта
                    }),
                    menu: (base) => ({
                        ...base,
                        background: "rgba(0, 0, 0, 0.9)", // Темный фон меню
                        color: "white", // Цвет текста
                        borderRadius: "8px", // Закругленные края
                    }),
                    option: (base, { isFocused, isSelected }) => ({
                        ...base,
                        background: isSelected
                            ? "rgba(128, 0, 128, 0.5)" // Цвет для выбранной опции
                            : isFocused
                                ? "rgba(128, 0, 128, 0.3)" // Цвет при наведении
                                : "transparent", // Прозрачный фон
                        color: "white", // Цвет текста
                        cursor: "pointer", // Указатель мыши
                    }),
                    singleValue: (base) => ({
                        ...base,
                        color: "white", // Цвет выбранного значения
                    }),
                }}
            />

            {/* Кнопка переключения глобального режима */}
            <button
                onClick={handleGlobalModeSwitch}
                style={{
                    marginTop: "10px",
                    padding: "10px",
                    width: "100%",
                    backgroundColor: "#00FFFF", // Цвет фона кнопки
                    border: "none", // Убираем границы
                    borderRadius: "8px", // Закругленные края
                    color: "white", // Цвет текста
                    fontSize: "14px", // Размер шрифта
                    fontWeight: "bold", // Жирный текст
                    cursor: "pointer", // Указатель мыши
                    boxShadow: "0 4px 6px rgba(148, 0, 211, 0.3)", // Тень кнопки
                }}
            >
                Switch Mode ({globalMode}) {/* Отображаем текущий режим */}
            </button>

            {/* Кнопки переключения оси */}
            <div style={{ marginTop: "10px" }}>
                <button
                    onClick={() => handleAxisModeChange("X")} // Устанавливаем ось X
                    style={{
                        width: "48%", // Ширина кнопки
                        marginRight: "4%", // Отступ справа
                        padding: "10px", // Внутренние отступы
                        backgroundColor: axisMode === "X" ? "#00FFFF" : "rgba(0, 255, 255, 0.2)", // Цвет фона зависит от состояния
                        border: "none", // Убираем границы
                        borderRadius: "8px", // Закругленные края
                        color: "white", // Цвет текста
                        fontSize: "14px", // Размер шрифта
                        fontWeight: "bold", // Жирный текст
                        cursor: "pointer", // Указатель мыши
                    }}
                >
                    Bet Z-Axis {/* Название кнопки */}
                </button>
                <button
                    onClick={() => handleAxisModeChange("Y")} // Устанавливаем ось Y
                    style={{
                        width: "48%", // Ширина кнопки
                        padding: "10px", // Внутренние отступы
                        backgroundColor: axisMode === "Y" ? "#00FFFF" : "rgba(0, 255, 255, 0.2)", // Цвет фона зависит от состояния
                        border: "none", // Убираем границы
                        borderRadius: "8px", // Закругленные края
                        color: "white", // Цвет текста
                        fontSize: "14px", // Размер шрифта
                        fontWeight: "bold", // Жирный текст
                        cursor: "pointer", // Указатель мыши
                    }}
                >
                    Bet Y-Axis {/* Название кнопки */}
                </button>
            </div>
        </div>
    );
};

export default SymbolSelector;
