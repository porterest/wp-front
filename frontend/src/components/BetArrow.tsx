import React, { useState, useEffect, useMemo } from "react";
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
  const { userData } = useUserBalance();
  const userDeposit = userData?.balance || 0;
  const maxArrowLength = 2;

  // Объединяем позицию и сумму ставки в один state
  const [betState, setBetState] = useState({
    x: userPreviousBet.x,
    y: userPreviousBet.y,
    amount: 0,
  });

  // Логгируем монтирование/размонтирование для отладки
  useEffect(() => {
    console.log("BetArrow mounted");
    return () => {
      console.log("BetArrow unmounted");
    };
  }, []);

  // Синхронизируем координаты с userPreviousBet
  useEffect(() => {
    setBetState((prev) => ({
      ...prev,
      x: userPreviousBet.x,
      y: userPreviousBet.y,
    }));
  }, [userPreviousBet]);

  // Обработчик перетаскивания
  const handleDrag = (newPosition: THREE.Vector3) => {
    // Обновляем родительское состояние, если позиция изменилась
    if (!userPreviousBet.equals(newPosition)) {
      setUserPreviousBet(new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z));
    }
    // Ограничиваем длину агрегированной линии
    const aggregatorClipped = previousBetEnd.clone();
    if (aggregatorClipped.length() > maxArrowLength) {
      aggregatorClipped.setLength(maxArrowLength);
    }
    // Вычисляем дистанцию и процент
    const distance = new THREE.Vector3().subVectors(newPosition, aggregatorClipped).length();
    const percentage = Math.min(distance / maxArrowLength, 1);
    const bet = Math.min(percentage * userDeposit, userDeposit);
    setBetState((prev) => ({ ...prev, amount: bet }));
  };

  // Мемоизированный объект для текста ставки
  const betText = useMemo(() => {
    if (betState.amount <= 0) return null;
    return (
      <Text
        position={[
          betState.x + 0.5,
          betState.y + 1,
          previousBetEnd.z + 0.5,
        ]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        depthOffset={-1} // Смещает текст по глубине, чтобы избежать наложения
      >
        {`Bet: $${betState.amount.toFixed(2)}`}
      </Text>
    );
  }, [betState, previousBetEnd.z]);

  return (
    <>
      {/* Компонент для отрисовки линий, который вызывает handleDrag */}
      <BetLines
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        maxYellowLength={maxArrowLength}
        maxWhiteLength={maxArrowLength}
        handleDrag={handleDrag}
        axisMode={axisMode}
        setBetAmount={(bet) =>
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

      {/* Всегда рендерим один компонент для текста ставки */}
      {betText}
    </>
  );
};

export default BetArrow;
