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
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  betAmount: number;
  setBetAmount: (newAmount: number) => void;
  axisMode: "X" | "Y";
  betsFetched: boolean;
}

const DynamicGraphContent: React.FC<DynamicGraphContentProps> = ({
                                                                   currentMode,
                                                                   data,
                                                                   previousBetEnd,
                                                                   userPreviousBet,
                                                                   setUserPreviousBet,
                                                                   onDragging,
                                                                   onShowConfirmButton,
                                                                   betAmount,
                                                                   axisMode,
                                                                   setBetAmount,
                                                                   betsFetched,
                                                                 }) => {
  if (!betsFetched) return null;

  // Если режим только "Candles", рендерим только график свечей
  if (currentMode === 2 && data) {
    return <CandlestickChart data={data} mode="Candles" />;
  }

  // Если режим только "Axes", рендерим только стрелку
  if (currentMode === 1) {
    return (
      <BetArrow
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        setUserPreviousBet={setUserPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        axisMode={axisMode}
        visitable={true}
      />
    );
  }

  // Если режим "Both", рендерим и график, и стрелку
  if (currentMode === 3 && data) {
    return (
      <>
        <CandlestickChart data={data} mode="Both" />
        <BetArrow
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          axisMode={axisMode}
          visitable={true}
        />
      </>
    );
  }

  return null;
};

export default DynamicGraphContent;