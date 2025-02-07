import React, { useState, useMemo } from "react";
import BetArrow from "./BetArrow";
import * as THREE from "three";
import CandlestickChart from "./CandlestickChart";
import GradientPlanes from "./GradientPlanes";
import Axes from "./Axes";
import { PairOption } from "../types/pair";
import { CandleData } from "../types/candles";

interface GraphModesProps {
  currentMode: number; // 1: Axes, 2: Candles, 3: Both
  data: CandleData[] | null;
  selectedPair: PairOption | null;
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  setUserPreviousBet: (value: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  betsFetched: boolean;
}

const GraphModes: React.FC<GraphModesProps> = ({
                                                 currentMode,
                                                 data,
                                                 previousBetEnd,
                                                 userPreviousBet,
                                                 setUserPreviousBet,
                                                 axisMode,
                                                 onDragging,
                                                 onShowConfirmButton,
                                                 betsFetched,
                                               }) => {
  // Состояние суммы ставки вынесено в родительский компонент,
  // чтобы оно сохранялось между переключениями режимов.
  const [betAmount, setBetAmount] = useState(0);

  // Используем useMemo, чтобы пересчитывать результат только при изменении нужных зависимостей.
  const renderedData = useMemo(() => {
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
    }
    if (currentMode === 2 && data) {
      return <CandlestickChart data={data} mode="Candles" />;
    }
    if (currentMode === 3 && data) {
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
  }, [betsFetched, data, currentMode, previousBetEnd, userPreviousBet, setUserPreviousBet, axisMode, onDragging, onShowConfirmButton, betAmount, setBetAmount]);

  return (
    <>
      <GradientPlanes />
      <Axes />
      {renderedData}
    </>
  );
};

export default GraphModes;
