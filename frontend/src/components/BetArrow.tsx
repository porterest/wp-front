import React, { useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import BetLines from "./BetLines";
import * as THREE from "three";
import { useUserBalance } from "../pages/BalancePage";

interface BetArrowProps {
  previousBetEnd: THREE.Vector3; // Конец агрегированной (желтой) линии
  userPreviousBet: THREE.Vector3; // Текущая позиция пользовательской ставки
  setUserPreviousBet: (value: THREE.Vector3) => void;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  axisMode: "X" | "Y";
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             axisMode,
                                           }) => {
  const { userData } = useUserBalance();
  const userDeposit = userData?.balance || 0;
  const maxArrowLength = 2;

  // Локальное состояние для хранения позиции и вычисленной суммы ставки
  const [betState, setBetState] = useState({
    x: userPreviousBet.x,
    y: userPreviousBet.y,
    amount: 0,
  });

  // При изменении userPreviousBet обновляем локальную позицию
  useEffect(() => {
    setBetState((prev) => ({
      ...prev,
      x: userPreviousBet.x,
      y: userPreviousBet.y,
    }));
  }, [userPreviousBet]);

  // Обработчик перетаскивания: обновляет позицию и вычисляет ставку
  const handleDrag = (newPosition: THREE.Vector3) => {
    if (!userPreviousBet.equals(newPosition)) {
      setUserPreviousBet(new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z));
    }
    const aggregatorClipped = previousBetEnd.clone();
    if (aggregatorClipped.length() > maxArrowLength) {
      aggregatorClipped.setLength(maxArrowLength);
    }
    const distance = new THREE.Vector3()
      .subVectors(newPosition, aggregatorClipped)
      .length();
    const percentage = Math.min(distance / maxArrowLength, 1);
    const bet = Math.min(percentage * userDeposit, userDeposit);
    setBetState((prev) => ({ ...prev, amount: bet }));
  };

  return (
    <>
      {/* Компонент для отрисовки линий, обновляет позицию и ставку */}
      <BetLines
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        maxYellowLength={maxArrowLength}
        maxWhiteLength={maxArrowLength}
        handleDrag={handleDrag}
        axisMode={axisMode}
        setBetAmount={(bet: number) =>
          setBetState((prev) => ({ ...prev, amount: bet }))
        }
      />

      {/* Текст депозита */}
      <Text
        position={[1, 5.3, 0]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        {`Deposit: $${userDeposit.toFixed(2)}`}
      </Text>

      {/* Текст ставки – отрисовывается всегда (без условия) */}
      <Text
        position={[betState.x + 0.5, betState.y + 1, previousBetEnd.z + 0.5]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        depthOffset={-1}
      >
        {`Bet: $${betState.amount.toFixed(2)}`}
      </Text>
    </>
  );
};

export default BetArrow;
