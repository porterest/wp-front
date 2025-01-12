import React, { useState } from "react";
import { Text } from "@react-three/drei";
import BetLines from "./BetLines";
import * as THREE from "three";
import { useUserBalance } from "../pages/BalancePage";

interface BetArrowProps {
  previousBetEnd: THREE.Vector3; // Конец желтой линии (агрегированная ставка)
  userPreviousBet: THREE.Vector3; // Ставка пользователя
  setUserPreviousBet: (value: THREE.Vector3) => void;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  axisMode: "X" | "Y"; // Ось движения
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             axisMode,
                                           }) => {
  const [xValue, setXValue] = useState(userPreviousBet.x); // Позиция X
  const [yValue, setYValue] = useState(userPreviousBet.y); // Позиция Y
  const [betAmount, setBetAmount] = useState(0); // Сумма ставки

  const { userData } = useUserBalance(); // Получение баланса пользователя
  const userDeposit = userData?.balance || 0; // Баланс по умолчанию 0
  const maxArrowLength = 5; // Максимальная длина желтой стрелки

  // Колбек для обработки перетаскивания из `BetLines`
  const handleDrag = (newPosition: THREE.Vector3) => {
    if (axisMode === "X") {
      setXValue(newPosition.x);
    } else if (axisMode === "Y") {
      setYValue(newPosition.y);
    }

    const distance = new THREE.Vector3()
      .subVectors(newPosition, previousBetEnd)
      .length();

    const percentage = Math.min(distance / maxArrowLength, 1);
    const bet = percentage * userDeposit;

    setBetAmount(Math.min(bet, userDeposit));
    setUserPreviousBet(newPosition);
  };

  return (
    <>
      {/* Компонент BetLines */}
      <BetLines
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton} // Передаем onShowConfirmButton в BetLines
        maxYellowLength={maxArrowLength}
        handleDrag={handleDrag} // Передача колбека для обработки перетаскивания
        axisMode={axisMode}
      />

      {/* Текст депозита */}
      <Text
        position={[previousBetEnd.x, previousBetEnd.y + 1, previousBetEnd.z]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        Deposit: ${userDeposit.toFixed(2)}
      </Text>

      {/* Текст ставки */}
      <Text
        position={[xValue + 0.5, yValue + 1, previousBetEnd.z + 0.5]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Bet: ${betAmount.toFixed(2)}
      </Text>
    </>
  );
};

export default BetArrow;
