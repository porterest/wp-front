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
                                                 previousBetEnd,
                                                 userPreviousBet,
                                                 setUserPreviousBet,
                                                 axisMode,
                                                 onDragging,
                                                 onShowConfirmButton,
                                               }) => {
  const renderContent = () => {
    switch (currentMode) {
      case 1:
        // Режим "Axes": отображаем только BetArrow.
        return (
          <BetArrow
            previousBetEnd={previousBetEnd}
            userPreviousBet={userPreviousBet}
            setUserPreviousBet={setUserPreviousBet}
            axisMode={axisMode}
            onDragging={onDragging}
            onShowConfirmButton={onShowConfirmButton}
          />
        );
      case 2:
        // Режим "Candles": отображаем только CandlestickChart.
        return data ? <CandlestickChart data={data} mode="Candles" /> : null;
      case 3:
        // Режим "Both": отображаем CandlestickChart и BetArrow.
        return data ? (
          <>
            <CandlestickChart data={data} mode="Both" />
            <BetArrow
              previousBetEnd={previousBetEnd}
              userPreviousBet={userPreviousBet}
              setUserPreviousBet={setUserPreviousBet}
              axisMode={axisMode}
              onDragging={onDragging}
              onShowConfirmButton={onShowConfirmButton}
            />
          </>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
      <GradientPlanes />
      <Axes />
      {renderContent()}
    </>
  );
};

export default GraphModes;
