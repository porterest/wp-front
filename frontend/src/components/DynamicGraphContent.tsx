import React from "react";
import BetArrow from "./BetArrow";
import CandlestickChart from "./CandlestickChart";
import * as THREE from "three";
import { CandleData } from "../types/candles";

interface DynamicGraphContentProps {
  currentMode: number; // 1: Axes, 2: Candles, 3: Both
  data: CandleData[] | null;
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  setUserPreviousBet: (value: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  betAmount: number;
  setBetAmount: (newAmount: number) => void;
  betsFetched: boolean;
}

const DynamicGraphContent: React.FC<DynamicGraphContentProps> = (props) => {
  const {
    currentMode,
    data,
    previousBetEnd,
    userPreviousBet,
    setUserPreviousBet,
    axisMode,
    onDragging,
    onShowConfirmButton,
    betAmount,
    setBetAmount,
    betsFetched,
  } = props;

  // Если данные не загружены, ничего не рендерим.
  if (!betsFetched) return null;

  return (
    <>
      {/* Если режим Candles или Both, отрисовываем график свечей */}
      {(currentMode === 2 || currentMode === 3) && data && (
        <CandlestickChart
          data={data}
          mode={currentMode === 2 ? "Candles" : "Both"}
          // Использование уникального ключа помогает корректно размонтировать компонент при смене режима или данных.
          key={`chart-${currentMode}-${data.length}`}
        />
      )}

      {/* Если режим Axes или Both, отрисовываем стрелку (BetArrow) */}
      {(currentMode === 1 || currentMode === 3) && (
        <BetArrow
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          axisMode={axisMode}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          // Уникальный ключ для корректного размонтирования
          key={`arrow-${currentMode}-${previousBetEnd.toArray().join("-")}`}
        />
      )}
    </>
  );
};

export default DynamicGraphContent;
