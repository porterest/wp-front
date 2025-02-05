import React from "react";
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
  return (
    <>
      <GradientPlanes />
      <Axes />

      {/* Отрисовка графика свечей для режимов Candles и Both */}
      {(currentMode === 2 || currentMode === 3) && data && (
        <CandlestickChart
          data={data}
          mode={currentMode === 2 ? "Candles" : "Both"}
        />
      )}

      {/* Отрисовка BetArrow для режимов Axes и Both.
          Добавляем key, зависящий от currentMode, чтобы при переключении моды компонент точно размонтировался */}
      {(currentMode === 1 || currentMode === 3) && (
        <BetArrow
          key={`betarrow-${currentMode}`}
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          axisMode={axisMode}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
        />
      )}
    </>
  );
};

export default GraphModes;
