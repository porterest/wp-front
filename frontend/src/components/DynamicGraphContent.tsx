import React, { useMemo } from "react";
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

  // Используем useMemo для оптимизации повторного рендеринга.
  // При изменении currentMode компоненты, которые не удовлетворяют условию, не будут рендериться,
  // а ранее смонтированные компоненты (например, BetArrow) размонтируются, и их функции очистки вызовутся.
  return useMemo(() => {
    if (!betsFetched) return null;

    if (currentMode === 1) {
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
    } else if (currentMode === 2 && data) {
      return <CandlestickChart data={data} mode="Candles" />;
    } else if (currentMode === 3 && data) {
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
    }
    return null;
  }, [
    betsFetched,
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
  ]);
};

export default DynamicGraphContent;
