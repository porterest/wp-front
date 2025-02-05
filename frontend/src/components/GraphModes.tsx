import React, { useState } from "react";
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
                                               }) => {
  // Состояние суммы ставки вынесено в родительский компонент,
  // чтобы оно сохранялось между переключениями режимов.
  const [betAmount, setBetAmount] = useState(0);

  return (
    <>
      <GradientPlanes />
      <Axes />

      {/* Режим "Candles" – отрисовываем только CandlestickChart */}
      {currentMode === 2 && data && (
        <CandlestickChart data={data} mode="Candles" />
      )}

      {/* Режим "Axes" – отрисовываем только BetArrow */}
      {currentMode === 1 && (
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
      )}

      {/* Режим "Both" – отрисовываем CandlestickChart и BetArrow */}
      {currentMode === 3 && data && (
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
      )}
    </>
  );
};

export default GraphModes;
