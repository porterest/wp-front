import React, { useEffect } from "react";
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
  betAmount: number;
  setBetAmount: (amount: number) => void;
  showArrows?: boolean;
  axisMode: "X" | "Y";
  visitable?: boolean;
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             betAmount,
                                             setBetAmount,
                                             showArrows = true, // по умолчанию стрелки отображаются
                                             axisMode,
                                             visitable = false,
                                           }) => {
  // Если стрелки не нужно отображать, сразу возвращаем null.
  if (!showArrows) {
    return null;
  }

  const { userData } = useUserBalance();
  const userDeposit = userData?.balance || 0;
  const maxArrowLength = 2.5;

  // Здесь можно добавить синхронизацию позиции, если необходимо
  useEffect(() => {
    // Например, можно выполнить дополнительную настройку
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
    setBetAmount(bet);
  };

  const formatNumber = (num: number) => {
    if (isNaN(num)) return "Invalid Number";

    const absNum = Math.abs(num);
    let suffix = "";
    let value = num;

    if (absNum >= 1e12) {
      value = num / 1e12;
      suffix = "T"; // Триллионы
    } else if (absNum >= 1e9) {
      value = num / 1e9;
      suffix = "B"; // Миллиарды
    } else if (absNum >= 1e6) {
      value = num / 1e6;
      suffix = "M"; // Миллионы
    } else if (absNum >= 1e3) {
      value = num / 1e3;
      suffix = "K"; // Тысячи
    }

    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + suffix;
  };

  return (
    <>
      {/* Отрисовка компонента, который добавляет линии и конусы в сцену */}
      <BetLines
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        // maxYellowLength={maxArrowLength}
        // maxWhiteLength={maxArrowLength}
        handleDrag={handleDrag}
        setBetAmount={setBetAmount}
        axisMode={axisMode}
        visible={visitable}
      />

      {/* Отрисовка текста с депозитом */}
      <Text
        position={[1, 5.3, 0]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        {`Deposit: ${formatNumber(userDeposit)} DD`}
      </Text>

      {/* Отрисовка текста со ставкой */}
      <Text
        position={[userPreviousBet.x + 0.5, userPreviousBet.y + 1, previousBetEnd.z + 0.5]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        depthOffset={-1}
      >
        {`Bet: ${formatNumber(betAmount)} DD`}
      </Text>
    </>
  );
};

export default BetArrow;