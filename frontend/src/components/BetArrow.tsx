import React, { useEffect, useState } from "react";
import { Text } from "@react-three/drei";
import BetLines from "./BetLines";
import * as THREE from "three";
import { useUserBalance } from "../pages/BalancePage";

interface BetArrowProps {
  previousBetEnd: THREE.Vector3; // Конец агрегированной (желтой) линии
  userPreviousBet: THREE.Vector3; // Текущая позиция пользовательской ставки
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  showArrows?: boolean;
  axisMode: "Y" | "Z";
  visitable?: boolean;
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
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
  const maxYellowLength = 2;
  const maxWhiteLength = 2;
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(null);


  // Можно добавить синхронизацию позиции, если необходимо
  useEffect(() => {
    // Например, можно выполнить дополнительную настройку
  }, [userPreviousBet]);

  useEffect(() => {
    // "Трогаем" betPosition, чтобы оно использовалось
    // Здесь ничего не делаем, это нужно только для удовлетворения TypeScript / линтера
  }, [betPosition]);


  // // Обработчик перетаскивания: обновляет позицию и вычисляет ставку
  // const handleDrag = (newPosition: THREE.Vector3) => {
  //   if (axisMode === "Z") {
  //     // Сохраняем y из текущей ставки (или из другого источника, например, aggregatorClipped.y)
  //     newPosition.y = userPreviousBet.y;
  //   }
  //   if (!userPreviousBet.equals(newPosition)) {
  //     setUserPreviousBet(new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z));
  //   }
  // };


  // Форматирование числа для отображения (добавляем суффиксы)
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
      {/* Компонент, добавляющий линии и конусы (стрелки) в сцену */}
      <BetLines
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        onDragging={onDragging}
        onShowConfirmButton={onShowConfirmButton}
        maxYellowLength={maxYellowLength}
        maxWhiteLength={maxWhiteLength}
        // handleDrag={handleDrag}
        axisMode={axisMode}
        visible={visitable}
        updateBetPosition={(pos: THREE.Vector3) => setBetPosition?.(pos)}
      />

      {/* Текст с депозитом */}
      <Text
        position={[1, 5.3, 0]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        {`Deposit: ${formatNumber(userDeposit)} DD`}
      </Text>

    </>
  );
};

export default BetArrow;
