import React, { useContext, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import BetArrow from "../components/BetArrow";
import GraphModes from "../components/GraphModes";
import Legend from "../components/Legend";
import SymbolSelector from "../components/SymbolSelector";
import Instructions from "../components/Instructions";
import ConfirmBetButton from "../components/ConfirmBetButton";
import Timer from "../components/Timer";
import { CandleDataContext } from "../context/CandleDataContext";
import { fetchPreviousBetEnd, getUserBets, placeBet } from "../services/api";
import { PlaceBetRequest } from "../types/apiTypes";

const GamePage: React.FC = () => {
    const context = useContext(CandleDataContext);

    if (!context) {
        throw new Error("CandleDataContext must be used within a CandleDataProvider");
    }

    const { data } = context;

    if (!data || data.length === 0) {
        console.error("No data available in CandleDataContext.");
        return null; // Рендер остановится, если данных нет.
    }

    const [orbitControlsEnabled, setOrbitControlsEnabled] = useState(true);
    const [currentMode, setCurrentMode] = useState(1);
    const [axisMode, setAxisMode] = useState<"X" | "Y">("X");
    const [previousBetEnd, setPreviousBetEnd] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
    const [userPreviousBet, setUserPreviousBet] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
    const [showConfirmButton, setShowConfirmButton] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [selectedPair, setSelectedPair] = useState<string | null>(null);
    const [currentBet, setCurrentBet] = useState<PlaceBetRequest | null>(null);
    const [betStatus, setBetStatus] = useState<"Active" | "Frozen" | "Result" | "">("");

    // Функция для загрузки прошлой ставки пользователя
    const loadUserLastBet = async (pair: string, startVector: THREE.Vector3) => {
        try {
            const response = await getUserBets();
            const lastBet = response.bets
              .filter((bet) => bet.pair_name === pair)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            if (lastBet && lastBet.vector) {
                const { x, y } = lastBet.vector;
                const userVector = new THREE.Vector3(x, y, 0);
                setUserPreviousBet(userVector);
            } else {
                console.warn("Последняя ставка пользователя по данной паре не найдена");
            }
        } catch (error) {
            console.error("Ошибка загрузки прошлой ставки пользователя:", error);
        }
    };

    // Загружаем данные при изменении пары
    useEffect(() => {
        if (selectedPair) {
            fetchPreviousBetEnd(selectedPair).then(({ x, y }) => {
                const resultVector = new THREE.Vector3(x, y, 0);
                setPreviousBetEnd(resultVector);
                loadUserLastBet(selectedPair, resultVector);
            });
        }
    }, [selectedPair]);

    // Обработчик для показа кнопки подтверждения ставки
    const handleShowConfirmButton = async (
      show: boolean,
      betData?: { amount: number; predicted_vector: number[] }
    ) => {
        if (betData && selectedPair) {
            try {
                const { x: currentPrice, y: currentTransactions } = await fetchPreviousBetEnd(selectedPair);

                const [predictedX, predictedY] = betData.predicted_vector;

                const priceFactor = predictedX / userPreviousBet.x;
                const transactionFactor = predictedY / userPreviousBet.y;

                const predictedPrice = currentPrice * priceFactor;
                const predictedTransactions = currentTransactions * transactionFactor;

                const betRequest: PlaceBetRequest = {
                    pair_id: selectedPair,
                    amount: betData.amount,
                    predicted_vector: [predictedPrice, predictedTransactions],
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

    // Управление прокруткой
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
            onTimerEnd={() => {}}
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

          <Canvas>
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
              <BetArrow
                previousBetEnd={previousBetEnd}
                userPreviousBet={userPreviousBet}
                setUserPreviousBet={setUserPreviousBet}
                onDragging={(isDragging) => setOrbitControlsEnabled(!isDragging)}
                onShowConfirmButton={handleShowConfirmButton}
                axisMode={axisMode}
              />
          </Canvas>

          {showConfirmButton && (
            <div className="absolute bottom-[20px] right-[20px] z-10">
                <ConfirmBetButton onConfirm={handleConfirmBet} />
            </div>
          )}
      </div>
    );
};

export default GamePage;
