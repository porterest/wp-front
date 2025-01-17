import React, { useContext, useEffect, useState } from "react";
import * as THREE from "three";
import GraphModes from "../components/GraphModes";
import Legend from "../components/Legend";
import SymbolSelector from "../components/SymbolSelector";
import Instructions from "../components/Instructions";
import ConfirmBetButton from "../components/ConfirmBetButton";
import Timer from "../components/Timer";
import { CandleDataContext } from "../context/CandleDataContext";
import { fetchPreviousBetEnd, getLastUserBet, placeBet } from "../services/api";
import { PlaceBetRequest } from "../types/apiTypes";
import Scene from "../components/Scene";
import { ScaleFunctions } from "../types/scale";
import { PairOption } from "../types/pair";

const GamePage: React.FC = () => {
  const context = useContext(CandleDataContext);

  if (!context) {
    throw new Error(
      "CandleDataContext must be used within a CandleDataProvider",
    );
  }

  const { data } = context;

  const [orbitControlsEnabled, setOrbitControlsEnabled] = useState(true);
  const [currentMode, setCurrentMode] = useState(1);
  const [axisMode, setAxisMode] = useState<"X" | "Y">("X");
  const [previousBetEnd, setPreviousBetEnd] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0),
  );
  const [userPreviousBet, setUserPreviousBet] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0),
  );
  const [scaleFunctions, setScaleFunctions] = useState<ScaleFunctions | null>(
    null,
  );
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedPair, setSelectedPair] = useState<PairOption | null>(null);
  const [currentBet, setCurrentBet] = useState<PlaceBetRequest | null>(null);


  const loadUserLastBet = async (pair: PairOption) => {
    try {
      const lastBet = await getLastUserBet(pair.value);
      console.log("last user Bet:", lastBet.vector);
      const userVector = new THREE.Vector3(
        lastBet.vector[0],
        lastBet.vector[1],
        0,
      );
      setUserPreviousBet(userVector);
      console.log("забрали с бека вектор:", userVector);
      console.log("userVector:", userVector);
    } catch (error) {
      console.error("Ошибка загрузки прошлой ставки пользователя:", error);
    }
  };

  useEffect(() => {
    if (selectedPair) {
      fetchPreviousBetEnd(selectedPair.value).then((data: number[]) => {
        console.log("агрегированный вектор");
        const resultVector = new THREE.Vector3(data[0], data[1], 0);
        console.log("res", JSON.stringify(resultVector, null, 2));
        setPreviousBetEnd(resultVector);
        loadUserLastBet(selectedPair);
      });
    }
  }, [selectedPair]);

  useEffect(() => {
    console.log("pair changed", selectedPair);
  }, [selectedPair]);

  useEffect(() => {
    console.log("data changed", data);
  }, [data]);

  useEffect(() => {
    console.log("scales changed", scaleFunctions);
  }, [scaleFunctions]);

  const handleShowConfirmButton = async (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => {
    // Если данные не готовы, ждем и пробуем снова
    if (!betData || !selectedPair || !scaleFunctions) {
      setTimeout(() => handleShowConfirmButton(show, betData), 100);
      return;
    }

    // Все условия выполнены, переходим к расчету ставки
    console.log("All conditions met, proceeding with bet calculation.");
    console.log(
      `betData: ${JSON.stringify(betData)}, selectedPair: ${JSON.stringify(selectedPair)}, scaleFunctions: ${JSON.stringify(scaleFunctions)}`,
    );

    try {
      const { denormalizeX, denormalizeY } = scaleFunctions;

      const [sceneX, sceneY] = betData.predicted_vector;

      console.log(sceneY);

      // Преобразуем координаты
      const absoluteVolumeChange = denormalizeX(sceneX, data.length);
      const absolutePriceChange = denormalizeY(sceneY);

      console.log(absolutePriceChange);

      const betRequest: PlaceBetRequest = {
        pair_id: selectedPair.value,
        amount: betData.amount,
        predicted_vector: [absoluteVolumeChange, absolutePriceChange],
      };

      console.log("Calculated bet request:", betRequest);

      // Устанавливаем состояние
      setShowConfirmButton(true);
      setCurrentBet(betRequest);
    } catch (error) {
      console.error("Ошибка при расчёте ставки:", error);
      setShowConfirmButton(false);
    }
  };

  const handleConfirmBet = async () => {
    if (!currentBet) return;

    try {
      const response = await placeBet(currentBet);
      console.log("Bet placed successfully:", response);
      setShowConfirmButton(false);
    } catch (error) {
      console.error("Error placing bet:", error);
    }
  };
  console.log("showConfirmButton state:", showConfirmButton);

  const legendItems = [
    { color: "5e00f5", label: "X-axis: Time Progress" },
    { color: "blue", label: "Y-axis: Ton Price" },
    { color: "cyan", label: "Z-axis: Number of Transactions" },
  ];

  useEffect(() => {
    console.log("showConfirmButton state changed:", showConfirmButton);
  }, [showConfirmButton]);


  useEffect(() => {
    if (window.Telegram) {
      const tg = window.Telegram.WebApp;

      // Уведомляем Telegram, что приложение готово
      tg.ready();

      // Разворачиваем приложение на полный экран
      tg.expand();
    }
  }, []);

  useEffect(() => {
    // Отключение скроллинга на уровне body
    document.body.style.overflow = "hidden"; // Отключение скроллинга
    document.body.style.position = "fixed"; // Фиксируем тело страницы
    document.body.style.width = "100%";

    return () => {
      // Возвращаем стили обратно при размонтировании компонента
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      window.scrollTo(0, 0);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);


  return (
    <div
      className="relative w-screen h-screen overflow-hidden touch-none"
    >
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
          onSymbolChange={(pair) => {
            console.log("Symbol changed in GamePage:", pair);
            setSelectedPair(pair);
          }}
        />
      </div>
      <Scene
        orbitControlsEnabled={orbitControlsEnabled}
        data={data}
        onScaleReady={(scales) => {
          console.log("Scales from Scene:", scales);
          setScaleFunctions(scales);
        }}
      >
        <GraphModes
          axisMode={axisMode}
          currentMode={currentMode}
          selectedPair={selectedPair}
          data={data}
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          onDragging={(isDragging) => setOrbitControlsEnabled(!isDragging)}
          onShowConfirmButton={(show, betData) => {
            console.log("onShowConfirmButton called with:", show, betData);
            handleShowConfirmButton(show, betData);
          }}
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