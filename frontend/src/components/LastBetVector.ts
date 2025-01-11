import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PairOption } from "../types/pair";

interface PairVectorsProps {
  selectedPair: PairOption | null;
  previousBetEnd: THREE.Vector3 | null; // Уточнение типа для возможности отсутствия данных
}

const LastBetVector: React.FC<PairVectorsProps> = ({
                                                     selectedPair,
                                                     previousBetEnd,
                                                   }) => {
  const { scene } = useThree();
  const maxLength = 2; // Максимальная длина стрелки

  useEffect(() => {
    if (!selectedPair) {
      console.warn("No selected pair provided.");
      return;
    }

    if (!previousBetEnd) {
      console.warn("No previous bet end provided.");
      return;
    }

    console.log("Selected Pair: ", selectedPair);
    console.log("Previous Bet End: ", previousBetEnd);

    // Ограничиваем длину вектора до 5 и рисуем стрелку
    const arrow = drawArrow(
      new THREE.Vector3(0, 0, 0),
      previousBetEnd,
      0xff0000
    );

    // Очистка стрелки при размонтировании компонента
    return () => {
      if (arrow) {
        scene.remove(arrow);
        console.log("Arrow removed from scene.");
      }
    };
  }, [selectedPair, previousBetEnd, scene]);

  /**
   * Функция для отрисовки стрелки между двумя точками с ограничением длины.
   * @param start Начальная точка.
   * @param end Конечная точка.
   * @param color Цвет стрелки.
   * @returns ArrowHelper объект, добавленный в сцену.
   */
  const drawArrow = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number = 0xff0000
  ): THREE.ArrowHelper => {
    // Вычисляем направление и длину вектора
    const direction = new THREE.Vector3().subVectors(end, start);
    let length = direction.length();

    // Ограничиваем длину до maxLength
    if (length > maxLength) {
      direction.setLength(maxLength);
      length = maxLength;
      console.log(`Vector length limited to ${maxLength}`);
    }

    const normalizedDirection = direction.normalize();

    console.log("Start vector:", start);
    console.log("End vector:", end);
    console.log("Normalized direction vector:", normalizedDirection);

    const arrowHelper = new THREE.ArrowHelper(
      normalizedDirection,
      start,
      length,
      color
    );
    scene.add(arrowHelper);
    console.log("Arrow added to scene:", arrowHelper);

    return arrowHelper;
  };

  return null;
};

export default LastBetVector;
