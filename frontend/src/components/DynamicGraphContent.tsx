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

const DynamicGraphContent: React.FC<DynamicGraphContentProps> = ({
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
                                                                 }) => {
  if (!betsFetched) return null;

  const showCandles = (currentMode === 2 || currentMode === 3) && data;
  const showArrows = currentMode === 1 || currentMode === 3;

  return (
    <>
      {showCandles && (
        <CandlestickChart
          data={data!}
          mode={currentMode === 2 ? "Candles" : "Both"}
          key={`chart-${currentMode}-${data!.length}`}
        />
      )}

      {showArrows && (
        <BetArrow
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          axisMode={axisMode}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          key={`arrow-${currentMode}`}
          showArrows={showArrows} // Передаём флаг управления отображением стрелок
        />
      )}
    </>
  );
};

export default DynamicGraphContent;
