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
  axisMode: "X" | "Y";
  betAmount: number;
  setBetAmount: (amount: number) => void;
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             axisMode,
                                             betAmount,
                                             setBetAmount,
                                           }) => {
  const { userData } = useUserBalance();
  const userDeposit = userData?.balance || 0;
  const maxArrowLength = 2;

  // Синхронизируем позицию из userPreviousBet с внутренними вычислениями,
  // но состояние суммы ставки (betAmount) теперь контролируется родителем.
  useEffect(() => {
    // Если требуется, можно добавить синхронизацию позиции.
    // Здесь мы просто гарантируем, что позиция обновлена.
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

    const absNum = Math.abs(num); // Работает и с отрицательными числами
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

    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
  };

  return (
    <>
      {/* Компонент для отрисовки линий. Он вызывает handleDrag, который обновляет позицию и ставку. */}
      <BetLines
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        maxYellowLength={maxArrowLength}
        maxWhiteLength={maxArrowLength}
        handleDrag={handleDrag}
        axisMode={axisMode}
        setBetAmount={setBetAmount}
      />

      {/* Текст депозита */}
      <Text
        position={[1, 5.3, 0]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        {`Deposit: ${formatNumber(userDeposit)} DD`}
      </Text>

      {/* Текст ставки */}
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
