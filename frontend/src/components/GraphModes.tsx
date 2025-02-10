import React, { useState } from "react";
import StaticGraphElements from "./StaticGraphElements";
import DynamicGraphContent from "./DynamicGraphContent";
import * as THREE from "three";
// import { PairOption } from "../types/pair";
import { CandleData } from "../types/candles";

interface GraphModesProps {
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
  // State for bet amount preserved across mode switches
  const [betAmount, setBetAmount] = useState(0);

  return (
    <>
      <StaticGraphElements />
      <DynamicGraphContent
        currentMode={currentMode}
        data={data}
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        setUserPreviousBet={setUserPreviousBet}
        axisMode={axisMode}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        betsFetched={betsFetched}
      />
    </>
  );
};

export default GraphModes;