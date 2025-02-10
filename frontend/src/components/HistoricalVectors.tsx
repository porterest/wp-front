// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

/**
 * Свойства компонента:
 * - vectors: массив векторов-результатов для блока в виде [price, transactions]
 * - totalTime: общая длина оси времени (по умолчанию 5)
 * - accumulate: если true – стрелки строятся цепочкой (одна начинается там, где закончилась предыдущая)
 * - startPoint: стартовая точка цепочки (по умолчанию (0,0,0))
 * - timeAxis: ось, отвечающая за время (по умолчанию "z")
 * - scaleA и scaleB: коэффициенты масштабирования для смещения;
 *   по соглашению здесь значение с индексом 0 (price) пойдёт на offsetAxes[1] (например, ось y),
 *   а с индексом 1 (transactions) – на offsetAxes[0] (например, ось x)
 * - color: цвет стрелок
 */
interface HistoricalVectorsProps {
  vectors: Array<[number, number]>;
  totalTime?: number;
  accumulate?: boolean;
  startPoint?: THREE.Vector3;
  timeAxis?: "x" | "y" | "z";
  scaleA?: number;
  scaleB?: number;
  color?: string;
}

/**
 * Свойства для стрелки.
 * Каждая стрелка рисуется как линия от start до end с наконечником, ориентированным вдоль direction.
 */
interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
  coneScale?: number;
}

/** Функция для «зажима» значений в диапазоне [min, max] */
const clampVector = (v: THREE.Vector3, min: number, max: number): THREE.Vector3 =>
  new THREE.Vector3(
    Math.min(max, Math.max(min, v.x)),
    Math.min(max, Math.max(min, v.y)),
    Math.min(max, Math.max(min, v.z))
  );

const Arrow: React.FC<ArrowProps> = ({
                                       start,
                                       end,
                                       direction,
                                       color = "yellow",
                                       coneScale = 1,
                                     }) => {
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вверх
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      <mesh position={end} quaternion={coneQuaternion}>
        <coneGeometry args={[0.1 * coneScale, 0.3 * coneScale, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               totalTime = 5,
                                                               accumulate = true,
                                                               startPoint = new THREE.Vector3(0, 0, 0),
                                                               timeAxis = "z",
                                                               // По соглашению:
                                                               //   scaleA применяется к компоненте с индексом 1 (transactions) – попадёт на offsetAxes[0]
                                                               //   scaleB применяется к компоненте с индексом 0 (price) – попадёт на offsetAxes[1]
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  // Определяем, какая ось отвечает за время, а оставшиеся – за смещения.
  const allAxes: ("x" | "y" | "z")[] = ["x", "y", "z"];
  const offsetAxes = allAxes.filter((ax) => ax !== timeAxis) as ("x" | "y" | "z")[];

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (accumulate) {
      // Режим цепочки с накоплением: каждая следующая стрелка начинается там, где закончилась предыдущая.
      let currentPoint = startPoint.clone();
      currentPoint = clampVector(currentPoint, 0, 5);
      for (let i = 0; i < count; i++) {
        // Задаём координату времени для текущего блока:
        currentPoint[timeAxis] = i * delta;
        // Вычисляем смещение:
        // — ВАЖНО: «переставляем» компоненты:
        //   offset[offsetAxes[0]] получит значение resultVector[1] (transactions) с масштабированием scaleA,
        //   offset[offsetAxes[1]] получит resultVector[0] (price) с масштабированием scaleB.
        const offset = new THREE.Vector3(0, 0, 0);
        offset[offsetAxes[0]] = vectors[i][1] * scaleA;
        offset[offsetAxes[1]] = vectors[i][0] * scaleB;
        // Вычисляем конечную точку стрелки:
        const nextPoint = currentPoint.clone().add(offset);
        // Чтобы сохранить ось времени неизменной для данного блока:
        nextPoint[timeAxis] = i * delta;
        // Ограничиваем обе точки значениями от 0 до 5:
        const clampedStart = clampVector(currentPoint.clone(), 0, 5);
        const clampedEnd = clampVector(nextPoint.clone(), 0, 5);
        // Определяем направление стрелки (если смещение 0, то по умолчанию вверх):
        const direction =
          offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
        chain.push({
          start: clampedStart,
          end: clampedEnd,
          direction,
        });
        // Для следующей стрелки начинаем с точки nextPoint (уже ограниченной):
        currentPoint = clampedEnd.clone();
      }
    } else {
      // Независимый режим: каждая стрелка отрисовывается отдельно.
      for (let i = 0; i < count; i++) {
        const basePoint = startPoint.clone();
        basePoint[timeAxis] = i * delta;
        const offset = new THREE.Vector3(0, 0, 0);
        offset[offsetAxes[0]] = vectors[i][1] * scaleA;
        offset[offsetAxes[1]] = vectors[i][0] * scaleB;
        const endPoint = basePoint.clone().add(offset);
        endPoint[timeAxis] = i * delta;
        const clampedBase = clampVector(basePoint, 0, 5);
        const clampedEnd = clampVector(endPoint, 0, 5);
        const direction =
          offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
        chain.push({
          start: clampedBase,
          end: clampedEnd,
          direction,
        });
      }
    }
    return chain;
  }, [vectors, accumulate, count, delta, startPoint, timeAxis, offsetAxes, scaleA, scaleB]);

  // Масштаб для наконечников (уменьшается при большом числе стрелок, но не меньше 0.3)
  const coneScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color={color}
          coneScale={coneScale}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
