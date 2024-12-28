import React, { useContext, useEffect, useState } from "react";
import * as THREE from "three";
import Scene from "../components/Scene";
import GraphModes from "../components/GraphModes";
import Legend from "../components/Legend";
import SymbolSelector from "../components/SymbolSelector";
import Instructions from "../components/Instructions";
import ConfirmBetButton from "../components/ConfirmBetButton";
import { CandleDataContext } from "../context/CandleDataContext";
import { fetchBetStatuses, fetchPreviousBetEnd, placeBet, getUserBets } from "../services/api";
import { BetStatusResponse, PlaceBetRequest } from "../types/apiTypes";
import Timer from "../components/Timer";

const GamePage: React.FC = () => {
    const context = useContext(CandleDataContext);

    if (!context) {
        throw new Error(
          "CandleDataContext must be used within a CandleDataProvider"
        );
    }

    const { data } = context;
    if (!data || data.length === 0) {
        console.error("No data available in CandleDataContext.");
        return null; // Рендер остановится, если данных нет.
    }

    // Локальные состояния
    const [orbitControlsEnabled, setOrbitControlsEnabled] = useState(true);
    const [currentMode, setCurrentMode] = useState(1);
    const [axisMode, setAxisMode] = useState<"X" | "Y">("X");
    const [previousBetEnd, setPreviousBetEnd] = useState<THREE.Vector3>(
      new THREE.Vector3(0, 0, 0) // Инициализируем начальным значением
    );
    const [userPreviousBet, setUserPreviousBet] = useState<THREE.Vector3>(
      new THREE.Vector3(0, 0, 0)
    );
    const [showConfirmButton, setShowConfirmButton] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [selectedPair, setSelectedPair] = useState<string | null>(null);
    const [currentBet, setCurrentBet] = useState<PlaceBetRequest | null>(null);
    const [betStatus, setBetStatus] = useState<"Active" | "Frozen" | "Result" | "">("");
    const [result, setResult] = useState<string | null>(null);

    // Функция для загрузки предыдущей ставки
    const loadPreviousBetEnd = async () => {
        try {
            const response = await fetchPreviousBetEnd(selectedPair); // Делаем запрос к API
            const { x, y } = response;
            setPreviousBetEnd(new THREE.Vector3(x, y, 0)); // Устанавливаем полученные координаты
        } catch (error) {
            console.error("Ошибка загрузки предыдущей ставки:", error);
        }
    };

    // Функция для загрузки последней ставки пользователя
    const loadUserPreviousBet = async () => {
        try {
            const response = await getUserBets(); // Получаем все ставки пользователя
            const lastBet = response.bets.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]; // Берём последнюю ставку по дате

            if (lastBet && lastBet.vector) {
                const { x, y } = lastBet.vector; // Предполагается, что координаты хранятся в `vector`
                setUserPreviousBet(new THREE.Vector3(x, y, 0 || 0)); // Устанавливаем данные последней ставки
            }
        } catch (error) {
            console.error("Ошибка загрузки последней ставки пользователя:", error);
        }
    };

    // Загружаем данные при монтировании компонента
    useEffect(() => {
        loadPreviousBetEnd();
        loadUserPreviousBet();
    }, []);

    // Функция для управления отображением кнопки подтверждения ставки
    // const handleShowConfirmButton = (
    //   show: boolean,
    //   betData?: { amount: number; predicted_vector: number[] }
    // ) => {
    //     if (betData && selectedPair) {
    //         console.log("handleShowConfirmButton called with:", { show, betData });
    //         setShowConfirmButton(true);
    //         setCurrentBet({
    //             pair_id: selectedPair,
    //             amount: betData.amount,
    //             predicted_vector: betData.predicted_vector,
    //         });
    //     } else {
    //         setShowConfirmButton(false);
    //         setCurrentBet(null);
    //     }
    // };

    const handleShowConfirmButton = async (
      show: boolean,
      betData?: { amount: number; predicted_vector: number[] }
    ) => {
        if (betData && selectedPair) {
            try {
                // Запрос к API для получения реальных значений агрегированной ставки прошлого блока
                const { x: currentPrice, y: currentTransactions } = await fetchPreviousBetEnd(selectedPair);

                const [predictedX, predictedY] = betData.predicted_vector;

                // Расчет коэффициентов
                const priceFactor = predictedX / userPreviousBet.x;
                const transactionFactor = predictedY / userPreviousBet.y;

                // Прогнозируемые значения
                const predictedPrice = currentPrice * priceFactor;
                const predictedTransactions = currentTransactions * transactionFactor;

                // Формируем объект PlaceBetRequest
                const betRequest: PlaceBetRequest = {
                    pair_id: selectedPair,
                    amount: betData.amount,
                    predicted_vector: [predictedPrice, predictedTransactions], // Прогнозируемые значения
                };

                console.log("Calculated bet request:", betRequest);

                setShowConfirmButton(true);
                setCurrentBet(betRequest);
            } catch (error) {
                console.error("Ошибка при загрузке данных для коэффициентов:", error);
                setShowConfirmButton(false);
                setCurrentBet(null);
            }
        } else {
            setShowConfirmButton(false);
            setCurrentBet(null);
        }
    };



    // Обработка подтверждения ставки
    const handleConfirmBet = async () => {
        if (!currentBet) return;

        try {
            const response = await placeBet(currentBet);
            console.log("Bet placed successfully:", response);

            setShowConfirmButton(false);
            setBetStatus("Active");
        } catch (error) {
            console.error("Error placing bet:", error);
        }
    };

    // Логика обновления статусов ставок
    const handleTimerEnd = async () => {
        try {
            // Случайная задержка от 0 до 5 секунд
            const delay = Math.random() * 5000;
            await new Promise((resolve) => setTimeout(resolve, delay));

            const response: BetStatusResponse = await fetchBetStatuses();

            if (response.bets.length === 0) {
                setBetStatus("");
                setResult(null);
            } else {
                const completedBet = response.bets.find((bet) => bet.status === "result");
                const frozenBet = response.bets.find((bet) => bet.status === "frozen");

                if (completedBet) {
                    setBetStatus("Result");
                    setResult(
                      `Ставка: ${completedBet.pair_name}, Результат: ${completedBet.result}`
                    );
                } else if (frozenBet) {
                    setBetStatus("Frozen");
                    setResult(`Ставка: ${frozenBet.pair_name}, Статус: Заморожено`);
                }
            }

            if (response.bets.some((bet) => bet.status === "frozen")) {
                console.log("Таймер перезапущен: есть замороженные ставки");
            }
        } catch (error) {
            console.error("Ошибка получения статусов ставок:", error);
        }
    };

    // useEffect для предотвращения скроллинга
    useEffect(() => {
        const preventScroll = () => document.body.classList.add("no-scroll");
        const allowScroll = () => document.body.classList.remove("no-scroll");

        preventScroll();

        const preventDefault = (e: TouchEvent) => e.preventDefault();
        document.addEventListener("touchmove", preventDefault, { passive: false });

        const instructionsShown = localStorage.getItem("instructionsShown");
        if (!instructionsShown) {
            setShowInstructions(true);
            localStorage.setItem("instructionsShown", "true");
        }

        return () => {
            allowScroll();
            document.removeEventListener("touchmove", preventDefault);
        };
    }, []);

    // Легенда для отображения осей графика
    const legendItems = [
        { color: "5e00f5", label: "X-axis: Time Progress" },
        { color: "blue", label: "Y-axis: Ton Price" },
        { color: "cyan", label: "Z-axis: Number of Transactions" },
    ];

    return (
      <div className="relative w-screen h-screen overflow-hidden touch-none">
          {showInstructions && (
            <Instructions onClose={() => setShowInstructions(false)} />
          )}

          <Timer
            onTimerEnd={handleTimerEnd}
            className="absolute top-[50px] left-1/2 transform -translate-x-1/2 z-10"
          />

          <div className="relative top-[5px] left-1/2 transform -translate-x-1/2 z-10">
              <Legend items={legendItems} />
          </div>

          <div className="absolute top-[100px] right-[20px] z-10">
              <SymbolSelector
                onSwitchMode={(mode) =>
                  setCurrentMode(mode === "Axes" ? 1 : mode === "Candles" ? 2 : 3)
                }
                onAxisModeChange={setAxisMode}
                onSymbolChange={(pair) => setSelectedPair(pair)}
              />
          </div>

          <Scene orbitControlsEnabled={orbitControlsEnabled}>
              <GraphModes
                axisMode={axisMode}
                currentMode={currentMode}
                data={data}
                previousBetEnd={previousBetEnd}
                userPreviousBet={userPreviousBet}
                setUserPreviousBet={setUserPreviousBet}
                onDragging={(isDragging) => setOrbitControlsEnabled(!isDragging)}
                onShowConfirmButton={handleShowConfirmButton}
              />
          </Scene>

          {showConfirmButton && (
            <div className="absolute bottom-[20px] right-[20px] z-10">
                <ConfirmBetButton onConfirm={handleConfirmBet} />
            </div>
          )}

      </div>
    );
};

export default GamePage;
