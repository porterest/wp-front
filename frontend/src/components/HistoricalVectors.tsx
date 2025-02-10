// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив входных векторов, например: [[a, b], [a, b], …] – каждый result vector */
  vectors: Array<[number, number]>;
  /** Исходная точка цепочки (например, previousBetEnd). По умолчанию (0, 0, 1). */
  startPoint?: THREE.Vector3;
  /** Коэффициент масштабирования для компоненты a (ось X смещения) – по умолчанию 1. */
  scaleX?: number;
  /** Коэффициент масштабирования для компоненты b (ось Y смещения) – по умолчанию 1. */
  scaleY?: number;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
  coneScale?: number;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, direction, color = "yellow", coneScale = 1 }) => {
  // Создаем линию стрелки
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

  // Поворачиваем конус так, чтобы он смотрел в направлении offset
  const coneQuaternion = useMemo(() => {
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

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               startPoint = new THREE.Vector3(0, 0, 1),
                                                               scaleX = 1,
                                                               scaleY = 1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);
  // Используем startPoint (например, previousBetEnd) и фиксируем z = 1:
  const adjustedStart = useMemo(() => {
    const pt = startPoint.clone();
    pt.z = 1;
    return pt;
  }, [startPoint]);
  console.log("Adjusted startPoint:", adjustedStart.toArray());

  // Вычисляем цепочку стрелок: каждая стрелка начинается там, где закончилась предыдущая.
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = adjustedStart.clone();
    vectors.forEach((vec, i) => {
      // Смещение = (a * scaleX, b * scaleY, 0)
      const offset = new THREE.Vector3(vec[0] * scaleX, vec[1] * scaleY, 0);
      const nextPoint = currentPoint.clone().add(offset);
      // Фиксируем z = 1 для всех точек
      currentPoint.z = 1;
      nextPoint.z = 1;
      const direction = offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
      chain.push({ start: currentPoint.clone(), end: nextPoint.clone(), direction });
      console.log(`Arrow ${i}: start=${currentPoint.toArray()}, offset=${offset.toArray()}, end=${nextPoint.toArray()}, direction=${direction.toArray()}`);
      currentPoint = nextPoint.clone();
    });
    console.log("Computed arrowChain:", chain.map(item => ({
      start: item.start.toArray(),
      end: item.end.toArray(),
      direction: item.direction.toArray(),
    })));
    return chain;
  }, [vectors, adjustedStart, scaleX, scaleY]);

  // Вычисляем масштаб для наконечников: например, базовый масштаб равен 1 при 5 векторах, уменьшается при увеличении числа.
  const coneScale = useMemo(() => {
    const n = vectors.length;
    return Math.max(0.3, Math.sqrt(5 / n));
  }, [vectors.length]);
  console.log("Computed coneScale:", coneScale);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color="yellow"
          coneScale={coneScale}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
