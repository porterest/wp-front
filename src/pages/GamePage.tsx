import React, { useContext, useEffect, useState } from "react";
import { OrbitControls } from "@react-three/drei"; // Используем для управления камерой в 3D-сцене
import * as THREE from "three"; // Библиотека для работы с 3D
import Scene from "../components/Scene"; // Компонент для рендера 3D-сцены
import GraphModes from "../components/GraphModes"; // Компонент, который отображает графики в зависимости от режима
import Legend from "../components/Legend"; // Компонент для отображения легенды осей
import SymbolSelector from "../components/SymbolSelector"; // Компонент для выбора символа и управления режимами
import Instructions from "../components/Instructions"; // Компонент для отображения инструкций
import ConfirmBetButton from "../components/ConfirmBetButton"; // Компонент для кнопки подтверждения ставки
import { CandleDataContext } from "../context/CandleDataContext"; // Контекст для данных свечей

const GamePage: React.FC = () => {
    const context = useContext(CandleDataContext);

    if (!context) {
        throw new Error("CandleDataContext must be used within a CandleDataProvider");
    }

    const { data } = context;

    // Локальные состояния
    const [orbitControlsEnabled, setOrbitControlsEnabled] = useState(true); // Управляет доступностью управления камерой
    const [currentMode, setCurrentMode] = useState(1); // Текущий режим (1 - оси, 2 - свечи, 3 - комбинированный)
    const [axisMode, setAxisMode] = useState<"X" | "Y">("X"); // Активная ось для движения стрелки
    const previousBetEnd = new THREE.Vector3(2, 2, 2); // Конец предыдущей общей ставки
    const [userPreviousBet, setUserPreviousBet] = useState(new THREE.Vector3(4, 3, 4)); // Конечная точка пунктира (прошлая ставка пользователя)
    const [showConfirmButton, setShowConfirmButton] = useState(false); // Показывать ли кнопку подтверждения ставки
    const [showInstructions, setShowInstructions] = useState(false); // Показывать ли инструкции для пользователя

    // Функция для управления отображением кнопки подтверждения ставки
    const handleShowConfirmButton = (show: boolean) => {
        setShowConfirmButton(show);
    };

    // useEffect для обработки событий на странице (например, предотвращения скроллинга)
    useEffect(() => {
        const preventDefault = (e: TouchEvent) => e.preventDefault();
        document.body.style.overflow = "hidden";
        document.addEventListener("touchmove", preventDefault, { passive: false });

        // Проверяем, были ли уже показаны инструкции
        const instructionsShown = localStorage.getItem("instructionsShown");
        if (!instructionsShown) {
            setShowInstructions(true); // Если нет, показываем их
            localStorage.setItem("instructionsShown", "true"); // Сохраняем, что инструкции уже показаны
        }

        // Убираем обработчики событий и восстанавливаем скроллинг при размонтировании компонента
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("touchmove", preventDefault);
        };
    }, []);

    // Легенда для отображения осей графика
    const legendItems = [
        { color: "5e00f5", label: "X-axis: Time Progress" }, // Фиолетовый цвет для оси X
        { color: "blue", label: "Y-axis: Ton Price" }, // Синий цвет для оси Y
        { color: "cyan", label: "Z-axis: Number of Transactions" }, // Бирюзовый цвет для оси Z
    ];

    return (
        <div
            style={{
                width: "100vw", // Полная ширина окна
                height: "100vh", // Полная высота окна
                overflow: "hidden", // Отключаем скроллинг
                touchAction: "none", // Отключаем жесты, такие как зум или прокрутка
                position: "relative", // Для абсолютного позиционирования дочерних элементов
            }}
        >
            {/* Показываем инструкции, если их ещё не было */}
            {showInstructions && <Instructions onClose={() => setShowInstructions(false)} />}

            {/* Легенда осей */}
            <div
                style={{
                    position: "relative",
                    top: "10px",
                    left: "57%",
                    transform: "translateX(-50%)", // Центрируем легенду по горизонтали
                    zIndex: 10, // Поверх других элементов
                }}
            >
                <Legend items={legendItems} />
            </div>

            {/* Панель выбора символа и управления режимами */}
            <div
                style={{
                    position: "absolute",
                    top: "100px", // Отступ сверху
                    right: "20px", // Отступ справа
                    zIndex: 10, // Поверх 3D-сцены
                }}
            >
                <SymbolSelector
                    onSwitchMode={(mode) =>
                        setCurrentMode(mode === "Axes" ? 1 : mode === "Candles" ? 2 : 3) // Меняем режим
                    }
                    onAxisModeChange={setAxisMode} // Устанавливаем активную ось
                />
            </div>

            {/* 3D-сцена с графиками */}
            <Scene orbitControlsEnabled={orbitControlsEnabled}>
                <GraphModes
                    currentMode={currentMode} // Передаём текущий режим
                    data={data} // Данные свечей
                    previousBetEnd={previousBetEnd} // Конец жёлтой линии
                    userPreviousBet={userPreviousBet} // Конец пунктира (прошлая ставка пользователя)
                    setUserPreviousBet={setUserPreviousBet} // Функция для обновления конечной точки
                    axisMode={axisMode} // Передаём активную ось
                    onDragging={(isDragging) => setOrbitControlsEnabled(!isDragging)} // Включаем/выключаем управление камерой при перетаскивании
                    onShowConfirmButton={handleShowConfirmButton} // Управление отображением кнопки подтверждения
                />
            </Scene>

            {/* Кнопка подтверждения ставки */}
            {showConfirmButton && (
                <ConfirmBetButton
                    onConfirm={() => {
                        console.log("Bet confirmed!"); // Логируем подтверждение ставки
                        setShowConfirmButton(false); // Скрываем кнопку после подтверждения
                    }}
                />
            )}
        </div>
    );
};

export default GamePage;
