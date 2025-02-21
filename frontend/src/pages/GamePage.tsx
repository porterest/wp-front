import React, { useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import Legend from "../components/Legend";
import SymbolSelector from "../components/SymbolSelector";
import Instructions from "../components/Instructions";
import ConfirmBetButton from "../components/ConfirmBetButton";
import Timer from "../components/Timer";
import { fetchPreviousBetEnd, getLastUserBet, placeBet } from "../services/api";
import { PlaceBetRequest } from "../types/apiTypes";
import Scene from "../components/Scene";
import { ScaleFunctions } from "../types/scale";
import { PairOption } from "../types/pair";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import { CandleData } from "../types/candles";
import GraphModes from "../components/GraphModes";
import BetResultCard from "../components/BetResultCard";

const GamePage: React.FC = () => {
  const context = useDataPrefetch();
  if (!context) {
    throw new Error(
      "CandleDataContext must be used within a CandleDataProvider",
    );
  }
  const { data, setData } = context;

  const [orbitControlsEnabled, setOrbitControlsEnabled] = useState(true);
  const [currentMode, setCurrentMode] = useState(1);
  const [axisMode, setAxisMode] = useState<"X" | "Y">("X");
  const [previousBetEnd, setPreviousBetEnd] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 1),
  );
  const [userPreviousBet, setUserPreviousBet] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 1),
  );
  const [scaleFunctions, setScaleFunctions] = useState<ScaleFunctions | null>(
    null,
  );
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedPair, setSelectedPair] = useState<PairOption | null>(null);
  const [currentBet, setCurrentBet] = useState<PlaceBetRequest | null>(null);

  const [betsFetched, setBetsFetched] = useState<boolean>(false);
  const [historicalVectors, setHistoricalVectors] = useState<Array<[number, number]>>([]);


  useEffect(() => {
    // Инициализация Telegram Web App
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.disableVerticalSwipes();

      // Проверяем, поддерживается ли полноэкранный режим
      if (tg.canRequestFullscreen) {
        tg.requestFullscreen(); // Запрашиваем полный экран
      } else {
        console.log('Fullscreen mode is not supported');
      }
    }
  }, []);

  //Функция для загрузки последней ставки пользователя, обернутая в useCallback для предотвращения лишних пересозданий
  const loadUserLastBet = useCallback(async (pair: PairOption) => {
    try {
      const lastBet = await getLastUserBet(pair.value);
      const userVector = new THREE.Vector3(
        lastBet.vector[0],
        lastBet.vector[1],
        1,
      );
      console.log("userVector")
      console.log(userVector)
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
            1,
          );
          console.log("resultVector")
          console.log(resultVector)
          setPreviousBetEnd(resultVector);
          // Загрузка последней ставки пользователя параллельно
          await loadUserLastBet(selectedPair);
          setBetsFetched(true);
          console.log(betsFetched)
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
    (
      show: boolean,
      betData?: { amount: number; predicted_vector: number[] }
    ) => {
      if (!betData || !selectedPair) {
        console.warn("Торговая пара или данные ставки отсутствуют.");
        return;
      }

      console.log("Показ кнопки Confirm Bet");

      setShowConfirmButton(show);
      setCurrentBet({
        pair_id: selectedPair.value,
        amount: betData.amount,
        predicted_vector: betData.predicted_vector, // Пока без преобразования
      });
    },
    [selectedPair]
  );


  const handleConfirmBet = useCallback(async () => {
    if (!currentBet) return;

    console.log("Нажатие Confirm Bet. Проверяем данные свечей...");

    // Ждем свечи, если их ещё нет
    if (!data.candles || data.candles.length === 0) {
      console.log("Свечи отсутствуют. Ожидаем загрузку...");

      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (data.candles && data.candles.length > 0) {
            clearInterval(interval);
            resolve();
          }
        }, 500); // Проверка каждые 500 мс
      });

      console.log("Свечи загружены, продолжаем расчёт...");
    }

    try {
      if (!scaleFunctions) {
        console.error("Функции нормализации не доступны!");
        return;
      }

      const { denormalizeX, denormalizeY } = scaleFunctions;
      const [sceneX, sceneY] = currentBet.predicted_vector;

      let maxVolume = 0;

      if (data.candles != undefined) {
        maxVolume = Math.max(...data.candles.map((x: CandleData) => x.volume));
      }

      const absoluteVolumeChange = denormalizeX(sceneX, maxVolume);
      const absolutePriceChange = denormalizeY(sceneY);

      console.log("absoluteVolumeChange", absoluteVolumeChange);
      console.log("absolutePriceChange", absolutePriceChange);

      const betRequest: PlaceBetRequest = {
        ...currentBet,
        predicted_vector: [absolutePriceChange, absoluteVolumeChange],
      };

      console.log("Отправляем ставку:", betRequest);
      const response = await placeBet(betRequest);
      localStorage.setItem("userBetVector", JSON.stringify([
        currentBet.predicted_vector[0],
        currentBet.predicted_vector[1],
        1
      ]));

      console.log("АААААААААААААААААААААААААААААААА")
      console.log("userBetVector из хранилища")
      console.log(localStorage.getItem("userBetVector"))
      console.log("Ставка успешно размещена:", response);
      setShowConfirmButton(false);
    } catch (error) {
      console.error("Ошибка при размещении ставки:", error);
    }
  }, [currentBet, data.candles, scaleFunctions]);



  const legendItems = [
    { color: "#5e00f5", label: "X: Time Progress" },
    { color: "blue", label: "Y: Ton Price" },
    { color: "cyan", label: "Z: Number of Transactions" },
  ];

  useEffect(() => {
    console.log("showConfirmButton state changed:", showConfirmButton);
  }, [showConfirmButton]);

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisitedGamePage");
    if (!hasVisited) {
      setShowInstructions(true); // Показываем инструкцию
      localStorage.setItem("hasVisitedGamePage", "true"); // Отмечаем, что уже показывали
    }
  }, []);

  useEffect(() => {
    context.setSelectedPair(selectedPair);
  }, []);
  console.log(orbitControlsEnabled)
  return (
    <div className="relative w-screen h-screen overflow-hidden touch-none">
      {/* Компонент результата ставки в левом верхнем углу */}
      <BetResultCard className="absolute top-[50px] left-[20px] z-10" />

      {showInstructions && (
          <Instructions onClose={() => setShowInstructions(false)} />
        )}
        <Timer
          onTimerEnd={() => {
          }}
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
              setData((prev) => ({ ...prev, selectedPair: pair }));
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
            // передача полученных исторических векторов в GamePage
            onHistoricalFetched={(vectors) => {
              console.log("Historical vectors received in GamePage:", vectors);
              setHistoricalVectors(vectors);
            }}
          />
        </div>
        <Scene
          data={data.candles || []}
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={ setUserPreviousBet}
          axisMode={axisMode}
          onDragging={(isDragging) => setOrbitControlsEnabled(!isDragging)}
          onShowConfirmButton={(show, betData) => handleShowConfirmButton(show, betData)}
          currentMode={currentMode}
          betsFetched={betsFetched}
          onScaleReady={(scales) => {
            console.log("Scales from Scene:", scales);
            setScaleFunctions(scales);
          }}
          // Передача реальных исторических векторов в Scene
          historicalVectors={historicalVectors}
        >
          <GraphModes
            currentMode={currentMode}
            // selectedPair={selectedPair}
            data={data.candles || []}
            previousBetEnd={previousBetEnd}
            userPreviousBet={userPreviousBet}
            setUserPreviousBet={setUserPreviousBet}
            onDragging={(isDragging) => setOrbitControlsEnabled(!isDragging)}

            onShowConfirmButton={(show, betData) => {
              console.log("onShowConfirmButton called with:", show, betData);
              handleShowConfirmButton(show, betData);
            }}
            axisMode={axisMode}
            betsFetched={betsFetched}
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