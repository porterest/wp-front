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

  // Если данные ещё не загружены – ничего не рендерим
  if (!betsFetched) return null;

  // В зависимости от режима рендерим нужные компоненты
  switch (currentMode) {
    case 1:
      return (
        <BetArrow
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          axisMode={axisMode}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
        />
      );
    case 2:
      if (!data) return null;
      return <CandlestickChart data={data} mode="Candles" />;
    case 3:
      if (!data) return null;
      return (
        <>
          <CandlestickChart data={data} mode="Both" />
          <BetArrow
            previousBetEnd={previousBetEnd}
            userPreviousBet={userPreviousBet}
            setUserPreviousBet={setUserPreviousBet}
            axisMode={axisMode}
            onDragging={onDragging}
            onShowConfirmButton={onShowConfirmButton}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
          />
        </>
      );
    default:
      return null;
  }
};

export default DynamicGraphContent;
