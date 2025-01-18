import React, { useCallback, useContext, useEffect, useState } from "react";
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

  // Функция для загрузки последней ставки пользователя, обернутая в useCallback для предотвращения лишних пересозданий
  const loadUserLastBet = useCallback(async (pair: PairOption) => {
    try {
      const lastBet = await getLastUserBet(pair.value);
      const userVector = new THREE.Vector3(
        lastBet.vector[0],
        lastBet.vector[1],
        0,
      );
      setUserPreviousBet(userVector);
    } catch (error) {
      console.error("Ошибка загрузки прошлой ставки пользователя:", error);
    }
  }, []);

  // Одновременная загрузка данных: агрегированного вектора и последней ставки пользователя
  useEffect(() => {
    if (selectedPair) {
      const loadData = async () => {
        try {
          const prevBetData = await fetchPreviousBetEnd(selectedPair.value);
          const resultVector = new THREE.Vector3(
            prevBetData[0],
            prevBetData[1],
            0,
          );
          setPreviousBetEnd(resultVector);
          // Загрузка последней ставки пользователя параллельно
          loadUserLastBet(selectedPair);
        } catch (error) {
          console.error("Ошибка загрузки данных ставки:", error);
        }
      };
      loadData();
    }
  }, [selectedPair, loadUserLastBet]);

  // Логирование изменений для отладки (при необходимости можно удалить после оптимизации)
  useEffect(() => {
    console.log("pair changed", selectedPair);
  }, [selectedPair]);

  useEffect(() => {
    console.log("data changed", data);
  }, [data]);

  useEffect(() => {
    console.log("scales changed", scaleFunctions);
  }, [scaleFunctions]);

  // Оптимизированная функция для показа кнопки подтверждения
  const handleShowConfirmButton = useCallback(
    async (
      show: boolean,
      betData?: { amount: number; predicted_vector: number[] },
    ) => {
      if (!betData || !selectedPair || !scaleFunctions) {
        console.warn("Ожидание необходимых данных для расчета ставки.");
        return;
      }
      try {
        const { denormalizeX, denormalizeY } = scaleFunctions;
        const [sceneX, sceneY] = betData.predicted_vector;
        const absoluteVolumeChange = denormalizeX(sceneX, data.length);
        const absolutePriceChange = denormalizeY(sceneY);
        const betRequest: PlaceBetRequest = {
          pair_id: selectedPair.value,
          amount: betData.amount,
          predicted_vector: [absoluteVolumeChange, absolutePriceChange],
        };
        setShowConfirmButton(show);
        setCurrentBet(betRequest);
      } catch (error) {
        console.error("Ошибка при расчёте ставки:", error);
        setShowConfirmButton(false);
      }
    },
    [data, scaleFunctions, selectedPair],
  );

  const handleConfirmBet = useCallback(async () => {
    if (!currentBet) return;
    try {
      const response = await placeBet(currentBet);
      console.log("Bet placed successfully:", response);
      setShowConfirmButton(false);
    } catch (error) {
      console.error("Error placing bet:", error);
    }
  }, [currentBet]);

  const legendItems = [
    { color: "5e00f5", label: "X-axis: Time Progress" },
    { color: "blue", label: "Y-axis: Ton Price" },
    { color: "cyan", label: "Z-axis: Number of Transactions" },
  ];

  useEffect(() => {
    console.log("showConfirmButton state changed:", showConfirmButton);
  }, [showConfirmButton]);

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
          onSymbolChange={(pair) => {
            console.log("Symbol changed in GamePage:", pair);
            setSelectedPair(pair);
          }}
          onSwitchMode={(mode: "Candles" | "Axes" | "Both") => {
            console.log("Switch mode:", mode);
            let modeToSet = 1;
            switch (mode) {
              case "Axes":
                modeToSet = 1;
                break;
              case "Candles":
                modeToSet = 2;
                break;
              case "Both":
                modeToSet = 3;
                break;
            }
            setCurrentMode(modeToSet);
          }}
          onAxisModeChange={(axis: "X" | "Y") => {
            console.log("AxisModeChange:", axis);
            setAxisMode(axis);
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
