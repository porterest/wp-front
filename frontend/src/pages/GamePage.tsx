import React, { useContext, useEffect, useState } from "react";
import * as THREE from "three";
import GraphModes from "../components/GraphModes";
import Legend from "../components/Legend";
import SymbolSelector from "../components/SymbolSelector";
import Instructions from "../components/Instructions";
import ConfirmBetButton from "../components/ConfirmBetButton";
import Timer from "../components/Timer";
import { CandleDataContext } from "../context/CandleDataContext";
import { fetchPreviousBetEnd, getUserBets, placeBet } from "../services/api";
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

  const loadUserLastBet = async (pair: string) => {
    try {
      const response = await getUserBets();
      const lastBet = response.bets
        .filter((bet) => bet.pair_name === pair)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];
      console.log("last user Bet:", lastBet);
      const userVector = new THREE.Vector3(
        lastBet.vector[0],
        lastBet.vector[1],
        0,)
      setUserPreviousBet(userVector);
      console.log("userVector:", userVector);

    } catch (error) {
      console.error("Ошибка загрузки прошлой ставки пользователя:", error);
    }
  };

  useEffect(() => {
    if (selectedPair) {
      fetchPreviousBetEnd(selectedPair.value).then((data: number[]) => {
        console.log("ЖОПА");
        console.log(selectedPair.value);
        const resultVector = new THREE.Vector3(data[0], data[1], 0);
        console.log("res", JSON.stringify(resultVector, null, 2));
        setPreviousBetEnd(resultVector);
        loadUserLastBet(selectedPair.label);
      });
    }
  }, [selectedPair]);

  useEffect(() => {
    console.log("pair changed", selectedPair);
  }, [selectedPair]);

  useEffect(() => {
    console.log("data changed", data);
  }, [data]);

  // useEffect(() => {
  //   console.log('mode changed', currentMode);
  // }, [currentMode]);

  useEffect(() => {
    console.log("scales changed", scaleFunctions);
  }, [scaleFunctions]);

  // const handleShowConfirmButton = async (
  //   show: boolean,
  //   betData?: { amount: number; predicted_vector: number[] },
  // ) => {
  //   console.log("betData exists:", !!betData);
  //   console.log("selectedPair exists:", !!selectedPair);
  //   console.log("scaleFunctions exists:", !!scaleFunctions);
  //
  //   if (betData && selectedPair && scaleFunctions) {
  //     console.log(`betData: ${JSON.stringify(betData)}, selectedPair: ${JSON.stringify(selectedPair)}, scaleFunctions: ${JSON.stringify(scaleFunctions)}`);
  //     try {
  //       const { denormalizeX, denormalizeY } = scaleFunctions;
  //
  //       // Внутренние координаты из сцены
  //       const [sceneX, sceneY] = betData.predicted_vector;
  //
  //       // Преобразуем в абсолютные значения
  //       const absoluteVolumeChange = denormalizeX(sceneX, data.length);
  //       const absolutePriceChange = denormalizeY(sceneY);
  //
  //       const betRequest: PlaceBetRequest = {
  //         pair_id: selectedPair.value,
  //         amount: betData.amount,
  //         predicted_vector: [absoluteVolumeChange, absolutePriceChange],
  //       };
  //       console.log("scaleFunctions:", scaleFunctions ? "defined" : "null");
  //
  //       console.log("Calculated bet request:", betRequest);
  //
  //       setShowConfirmButton(true);
  //       console.log("showConfirmButton set to true");
  //       console.log('TRUUUUUUUUUE')
  //       setCurrentBet(betRequest);
  //     } catch (error) {
  //       console.error("Ошибка при расчёте ставки:", error);
  //       setShowConfirmButton(false);
  //     }
  //   } else {
  //     setShowConfirmButton(false);
  //   }
  // };

  const handleShowConfirmButton = async (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => {
    // Если данные не готовы, ждем и пробуем снова
    if (!betData || !selectedPair || !scaleFunctions) {
      console.log(
        "Waiting for selectedPair or scaleFunctions to be defined...",
      );
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

      // Преобразуем координаты
      const absoluteVolumeChange = denormalizeX(sceneX, data.length);
      const absolutePriceChange = denormalizeY(sceneY);

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

  // useEffect(() => {
  //   console.log("Scale functions:", scaleFunctions);
  //   console.log("Data:", data);
  //
  //   if (scaleFunctions && data && data.length > 0 && [2, 3].includes(currentMode) ) {
  //     const { denormalizeX } = scaleFunctions;
  //

  // // Вычисляем границы графика
  // const minX = denormalizeX(0, data.length);
  // const maxX = denormalizeX(data.length - 1, data.length);
  //
  // const minY = Math.min(...data.map((candle) => candle.low));
  // const maxY = Math.max(...data.map((candle) => candle.high));
  //
  // // console.log("Graph boundaries:");
  // console.log(`X-axis: from ${minX} to ${maxX}`);
  // console.log(`Y-axis: from ${minY} to ${maxY}`);
  // console.log(`Center: (${(minX + maxX) / 2}, ${(minY + maxY) / 2})`);
  //
  //     // Логируем каждую свечу
  //     data.forEach((candle, index) => {
  //       const normalizedX = denormalizeX(index, data.length);
  //       console.log(`Candle ${index}:`);
  //       console.log(`  X: ${normalizedX}`);
  //       console.log(`  Open: ${candle.open}, Close: ${candle.close}`);
  //       console.log(`  High: ${candle.high}, Low: ${candle.low}`);
  //     });
  //   }
  // }, [scaleFunctions, data, currentMode]);
  //

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
          // onShowConfirmButton={handleShowConfirmButton}
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
