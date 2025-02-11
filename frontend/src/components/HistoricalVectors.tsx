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
  aggregatorVector?: THREE.Vector3;
  timeAxis?: "x" | "y" | "z";
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
                                                               aggregatorVector,
                                                               totalTime = 5,
                                                               timeAxis = "z",

                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;

  // Вычисляем масштаб для наконечников заранее, чтобы можно было скорректировать шаг по оси Z.
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  // Если ось времени равна "z", то нам нужно, чтобы весь ряд стрелок (цепочка)
  // занимал не более totalTime единиц по оси Z, включая конус.
  // При этом конус имеет высоту 0.3 * coneScale.
  // Поэтому effectiveTotalTime = totalTime - coneHeight,
  // и шаг delta = effectiveTotalTime / (count - 1).
  const delta = count > 1 ? totalTime / (count - 1) : 0;


  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
      // Режим: ось времени Z, фиксированные значения по X и Y.
      // Все стрелки будут иметь: X = fixedTransaction, Y = fixedPrice,
      // а по оси Z они будут накапливаться с шагом delta (так, чтобы последний вектор не выходил за totalTime - coneHeight).
      let currentPoint = new THREE.Vector3(aggregatorVector?.x, aggregatorVector?.y, aggregatorVector?.z);
      console.log("Starting point (fixed):", currentPoint.toArray());
      for (let i = 0; i < count; i++) {
        console.log(`Arrow ${i} input vector: [${vectors[i][0]}, ${vectors[i][1]}]`);
        const offset = new THREE.Vector3(vectors[i][0], vectors[i][1], delta);
        console.log("offset", offset);
        const nextPoint = currentPoint.clone().add(offset);
        console.log("next point", nextPoint);
        console.log(
          `Arrow ${i} computed: start: ${currentPoint.toArray()}, offset: ${offset.toArray()}, end: ${nextPoint.toArray()}`
        );
        // Направление стрелки – вдоль оси Z (вверх по времени)
        const direction = nextPoint.clone().sub(currentPoint).normalize();
        chain.push({
          start: currentPoint.clone(),
          end: nextPoint.clone(),
          direction,
        });
        currentPoint = nextPoint.clone();
      }
    return chain;
  }, [vectors, count, delta, timeAxis, aggregatorVector]);

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
