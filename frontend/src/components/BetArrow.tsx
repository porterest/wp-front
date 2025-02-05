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

  // Локальное состояние для хранения позиции и суммы ставки
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

  // Обработчик перетаскивания. Он обновляет родительскую позицию и вычисляет ставку.
  const handleDrag = (newPosition: THREE.Vector3) => {
    // Если позиция изменилась, обновляем родительское состояние
    if (!userPreviousBet.equals(newPosition)) {
      setUserPreviousBet(new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z));
    }
    // Ограничиваем длину агрегированной линии
    const aggregatorClipped = previousBetEnd.clone();
    if (aggregatorClipped.length() > maxArrowLength) {
      aggregatorClipped.setLength(maxArrowLength);
    }
    // Вычисляем дистанцию от ограниченной позиции
    const distance = new THREE.Vector3()
      .subVectors(newPosition, aggregatorClipped)
      .length();
    const percentage = Math.min(distance / maxArrowLength, 1);
    const bet = Math.min(percentage * userDeposit, userDeposit);
    setBetState((prev) => ({ ...prev, amount: bet }));
  };

  // Функция для рендеринга текста ставки. Он отрисовывается только если ставка >= 0.5
  const renderBetText = () => {
    if (betState.amount < 0.5) return null;
    return (
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
    );
  };

  return (
    <>
      {/* Компонент для отрисовки линий. Он вызывает handleDrag при перетаскивании. */}
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

      {/* Текст для отображения депозита */}
      <Text
        position={[1, 5.3, 0]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        {`Deposit: $${userDeposit.toFixed(2)}`}
      </Text>

      {/* Рендерим текст ставки только если значение >= 0.5 */}
      {renderBetText()}
    </>
  );
};

export default BetArrow;
