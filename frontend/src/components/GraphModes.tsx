import React from "react";
import BetArrow from "./BetArrow"; // Компонент для управления стрелкой
import * as THREE from "three";
import CandlestickChart from "./CandlestickChart";
import GradientPlanes from "./GradientPlanes";
import Axes from "./Axes";
import { PairOption } from "../types/pair";
import { CandleData } from "../types/candles";

interface GraphModesProps {
  currentMode: number; // Текущий режим отображения графика
  data: CandleData[] | null; // Данные свечей
  selectedPair: PairOption | null;
  previousBetEnd: THREE.Vector3; // Конец предыдущей общей ставки
  userPreviousBet: THREE.Vector3; // Конец пунктира (прошлая ставка пользователя)
  setUserPreviousBet: (value: THREE.Vector3) => void; // Обновление конечной точки пользовательской ставки
  axisMode: "X" | "Y"; // Режим управления осями
  onDragging: (isDragging: boolean) => void; // Управление состоянием перетаскивания
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void; // Управление видимостью кнопки и передача данных ставки
}

const GraphModes: React.FC<GraphModesProps> = ({
                                                 currentMode,
                                                 data,
                                                 selectedPair,
                                                 previousBetEnd,
                                                 userPreviousBet,
                                                 setUserPreviousBet,
                                                 axisMode,
                                                 onDragging,
                                                 onShowConfirmButton,
                                               }) => {
  console.log(previousBetEnd);
  console.log(selectedPair);
  console.log("жопа2");
  const renderContent = () => {
    if (currentMode === 1) {
      console.log("Passing previousBetEnd to BetArrow:", previousBetEnd);

      return (
        <BetArrow
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          axisMode={axisMode}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
          // pairId={selectedPair?.value}
        />
      );
    }
    if (currentMode === 2 && data) {
      console.log("Passing previousBetEnd to BetArrow:", previousBetEnd);

      return <CandlestickChart data={data} mode="Candles" />;
    }
    if (currentMode === 3 && data) {
      console.log("Passing previousBetEnd to BetArrow:", previousBetEnd);

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
            // pairId={selectedPair?.value}
          />
        </>
      );
    }
    return null;
  };

  return (
    <>
      <GradientPlanes />
      <Axes />
      <BetArrow
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        setUserPreviousBet={setUserPreviousBet}
        axisMode={axisMode}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        // pairId={selectedPair?.value}
      />
      {renderContent()}
    </>
  );
};

export default GraphModes;