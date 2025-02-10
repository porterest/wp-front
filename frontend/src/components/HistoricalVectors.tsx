// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

/** Свойства компонента HistoricalVectors */
interface HistoricalVectorsProps {
  /** Массив векторов, например: [[price, transactions], [price, transactions], …] */
  vectors: Array<[number, number]>;
  /** Максимальное значение по любой оси (по умолчанию 5) */
  maxValue?: number;
  /** Стартовая точка цепочки (по умолчанию (0, 0, 0)) */
  startPoint?: THREE.Vector3;
  /** Коэффициент масштабирования для компоненты, которая пойдёт по оси X (price) */
  scaleX?: number;
  /** Коэффициент масштабирования для компоненты, которая пойдёт по оси Y (transactions) */
  scaleY?: number;
  /** Цвет стрелок (по умолчанию "yellow") */
  color?: string;
}

/** Свойства для отрисовки одной стрелки */
interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
  coneScale?: number;
}

/** Функция для зажатия координат в диапазоне [min, max] */
const clampVector = (v: THREE.Vector3, min: number, max: number): THREE.Vector3 =>
  new THREE.Vector3(
    Math.min(max, Math.max(min, v.x)),
    Math.min(max, Math.max(min, v.y)),
    Math.min(max, Math.max(min, v.z))
  );

/** Компонент, отрисовывающий одну стрелку (линия + наконечник) */
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
    // По умолчанию конус смотрит вверх (ось Y)
    const defaultDir = new THREE.Vector3(0, 1, 0);
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

/**
 * Компонент HistoricalVectors
 *
 * Каждая стрелка строится как цепочка: следующая стрелка начинается от того места,
 * где закончилась предыдущая. Для каждого шага выполняется логирование значений.
 */
const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               maxValue = 5,
                                                               startPoint = new THREE.Vector3(0, 0, 0),
                                                               scaleX = 1,
                                                               scaleY = 1,
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // Начинаем с начальной точки (она зажата в диапазоне [0, maxValue])
    let currentPoint = clampVector(startPoint.clone(), 0, maxValue);

    for (let i = 0; i < count; i++) {
      const vec = vectors[i];
      console.log(`Arrow ${i} input vector: [${vec[0]}, ${vec[1]}]`);

      // Вычисляем смещение по входному вектору:
      // Первая компонента (price) влияет на ось X, вторая (transactions) – на ось Y
      const offset = new THREE.Vector3(vec[0] * scaleX, vec[1] * scaleY, 0);

      // Следующая точка = текущая точка + смещение
      const nextPoint = currentPoint.clone().add(offset);

      // Зажимаем обе точки, чтобы не выйти за пределы [0, maxValue]
      const clampedStart = clampVector(currentPoint.clone(), 0, maxValue);
      const clampedEnd = clampVector(nextPoint.clone(), 0, maxValue);

      // Вычисляем направление стрелки
      const direction =
        offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();

      console.log(
        `Arrow ${i} computed: start: ${clampedStart.toArray()}, offset: ${offset.toArray()}, ` +
        `end: ${clampedEnd.toArray()}, direction: ${direction.toArray()}`
      );

      chain.push({ start: clampedStart, end: clampedEnd, direction });

      // Для следующей стрелки начало – это конец текущей
      currentPoint = clampedEnd.clone();
    }
    return chain;
  }, [vectors, count, startPoint, scaleX, scaleY, maxValue]);

  // Масштаб наконечников – уменьшается при большом количестве стрелок, но не меньше 0.3
  const coneScale = count > 1 ? Math.max(0.3, Math.sqrt(maxValue / (count - 1))) : 1;

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
