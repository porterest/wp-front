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

/**
 * Функция для зажатия (clamp) координат в диапазоне [min, max] для всех осей,
 * кроме указанной в excludeAxis.
 */
const clampVectorExcludingAxis = (
  v: THREE.Vector3,
  min: number,
  max: number,
  excludeAxis: "x" | "y" | "z"
): THREE.Vector3 => {
  return new THREE.Vector3(
    excludeAxis === "x" ? v.x : Math.min(max, Math.max(min, v.x)),
    excludeAxis === "y" ? v.y : Math.min(max, Math.max(min, v.y)),
    excludeAxis === "z" ? v.z : Math.min(max, Math.max(min, v.z))
  );
};

const Arrow: React.FC<ArrowProps> = ({
                                       start,
                                       end,
                                       direction,
                                       color = "yellow",
                                       coneScale = 1,
                                     }) => {
  // Создаём геометрию линии от start до end
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  // Создаём материал для линии
  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  // Вычисляем кватернион для ориентации конуса (наконечника стрелки)
  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вверх
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      {/* Здесь конус устанавливается в точке end */}
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

  // Для режима timeAxis === "z" мы игнорируем входные данные по ценам и транзакциям
  // и задаём фиксированные значения:
  const fixedPrice = 0.38313094359425115;
  const fixedTransaction = 0;

  // Вычисляем масштаб для наконечников заранее, чтобы можно было скорректировать шаг по оси Z.
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  // Если ось времени равна "z", то нам нужно, чтобы весь ряд стрелок (цепочка)
  // занимал не более totalTime единиц по оси Z, включая конус.
  // При этом конус имеет высоту 0.3 * coneScale.
  // Поэтому effectiveTotalTime = totalTime - coneHeight,
  // и шаг delta = effectiveTotalTime / (count - 1).
  let delta: number;
  if (timeAxis === "z") {
    const coneHeight = 0.3 * computedConeScale;
    const effectiveTotalTime = totalTime - coneHeight;
    delta = count > 1 ? effectiveTotalTime / (count - 1) : 0;
  } else {
    delta = count > 1 ? totalTime / (count - 1) : 0;
  }

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (timeAxis === "z") {
      // Режим: ось времени Z, фиксированные значения по X и Y.
      // Все стрелки будут иметь: X = fixedTransaction, Y = fixedPrice,
      // а по оси Z они будут накапливаться с шагом delta (так, чтобы последний вектор не выходил за totalTime - coneHeight).
      let currentPoint = new THREE.Vector3(fixedTransaction, fixedPrice, startPoint.z);
      console.log("Starting point (fixed):", currentPoint.toArray());
      for (let i = 0; i < count; i++) {
        console.log(`Arrow ${i} input vector: [${vectors[i][0]}, ${vectors[i][1]}]`);
        // Здесь offset задаётся только по оси Z (с шагом delta)
        const offset = new THREE.Vector3(0, 0, delta);
        const nextPoint = currentPoint.clone().add(offset);
        console.log(
          `Arrow ${i} computed: start: ${currentPoint.toArray()}, offset: ${offset.toArray()}, end: ${nextPoint.toArray()}`
        );
        // Направление стрелки – вдоль оси Z (вверх по времени)
        const direction = new THREE.Vector3(0, 0, 1);
        chain.push({
          start: currentPoint.clone(),
          end: nextPoint.clone(),
          direction,
        });
        currentPoint = nextPoint.clone();
      }
    } else {
      // Если ось времени не Z – используем предыдущий алгоритм
      const allAxes: ("x" | "y" | "z")[] = ["x", "y", "z"];
      const offsetAxes = allAxes.filter((ax) => ax !== timeAxis) as ("x" | "y" | "z")[];
      if (accumulate) {
        let currentPoint = clampVectorExcludingAxis(startPoint.clone(), 0, 5, timeAxis);
        for (let i = 0; i < count; i++) {
          console.log(`Arrow ${i} input vector: [${vectors[i][0]}, ${vectors[i][1]}]`);
          const offset = new THREE.Vector3(0, 0, delta);
          offset[offsetAxes[0]] = vectors[i][1] * scaleA;
          offset[offsetAxes[1]] = vectors[i][0] * scaleB;
          const nextPoint = currentPoint.clone().add(offset);
          console.log(
            `Arrow ${i} before clamp: start: ${currentPoint.toArray()}, offset: ${offset.toArray()}, nextPoint: ${nextPoint.toArray()}`
          );
          const clampedStart = clampVectorExcludingAxis(currentPoint.clone(), 0, 5, timeAxis);
          const clampedEnd = clampVectorExcludingAxis(nextPoint.clone(), 0, 5, timeAxis);
          const direction =
            offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
          console.log(
            `Arrow ${i} computed: start: ${clampedStart.toArray()}, offset: ${offset.toArray()}, end: ${clampedEnd.toArray()}, direction: ${direction.toArray()}`
          );
          chain.push({
            start: clampedStart,
            end: clampedEnd,
            direction,
          });
          currentPoint = nextPoint.clone();
        }
      } else {
        for (let i = 0; i < count; i++) {
          const basePoint = startPoint.clone();
          basePoint[timeAxis] = i * delta;
          const offset = new THREE.Vector3(0, 0, delta);
          offset[offsetAxes[0]] = vectors[i][1] * scaleA;
          offset[offsetAxes[1]] = vectors[i][0] * scaleB;
          const endPoint = basePoint.clone().add(offset);
          const clampedBase = clampVectorExcludingAxis(basePoint, 0, 5, timeAxis);
          const clampedEnd = clampVectorExcludingAxis(endPoint, 0, 5, timeAxis);
          const direction =
            offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
          console.log(
            `Independent Arrow ${i}: base: ${clampedBase.toArray()}, offset: ${offset.toArray()}, end: ${clampedEnd.toArray()}, direction: ${direction.toArray()}`
          );
          chain.push({
            start: clampedBase,
            end: clampedEnd,
            direction,
          });
        }
      }
    }
    return chain;
  }, [vectors, accumulate, count, delta, startPoint, timeAxis, scaleA, scaleB]);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color={color}
          coneScale={computedConeScale}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
