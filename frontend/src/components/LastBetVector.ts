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
  const bounds = {
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10,
    minZ: -10,
    maxZ: 10,
  }; // Границы графика

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

    // Ограничиваем длину вектора и рисуем стрелку
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
   * Функция для ограничения вектора в пределах заданных границ.
   * @param vector Исходный вектор.
   * @param min Минимальные значения границ.
   * @param max Максимальные значения границ.
   * @returns Ограниченный вектор.
   */
  const clampVector = (
    vector: THREE.Vector3,
    min: THREE.Vector3,
    max: THREE.Vector3
  ) => {
    return new THREE.Vector3(
      Math.max(min.x, Math.min(max.x, vector.x)),
      Math.max(min.y, Math.min(max.y, vector.y)),
      Math.max(min.z, Math.min(max.z, vector.z))
    );
  };

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
    const chartMin = new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ);
    const chartMax = new THREE.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ);

    // Ограничиваем конечную точку в пределах границ
    const clampedEnd = clampVector(end, chartMin, chartMax);

    // Вычисляем направление и длину вектора
    const direction = new THREE.Vector3().subVectors(clampedEnd, start);
    let length = direction.length();

    // Ограничиваем длину до maxLength
    if (length > maxLength) {
      direction.setLength(maxLength);
      length = maxLength;
      console.log(`Vector length limited to ${maxLength}`);
    }

    const normalizedDirection = direction.normalize();

    console.log("Start vector:", start);
    console.log("Clamped end vector:", clampedEnd);
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
