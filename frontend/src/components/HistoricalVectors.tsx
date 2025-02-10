// HistoricalVectors.tsx (вариант цепочки с накоплением)
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов, например: [[a, b], [a, b], …] – смещения result vector */
  vectors: Array<[number, number]>;
  /**
   * Временной диапазон (ось X) для распределения стрелок.
   * По умолчанию 5.
   */
  totalTime?: number;
  /**
   * Начальная точка цепочки (по умолчанию (0, 0, 0)).
   */
  startPoint?: THREE.Vector3;
  /**
   * Коэффициент масштабирования для первой компоненты смещения (ось Y).
   * По умолчанию 1.
   */
  scaleY?: number;
  /**
   * Коэффициент масштабирования для второй компоненты смещения (ось Z).
   * По умолчанию 1.
   */
  scaleZ?: number;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
  coneScale?: number;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, direction, color = "yellow", coneScale = 1 }) => {
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
                                                               totalTime = 5,
                                                               startPoint = new THREE.Vector3(0, 0, 0),
                                                               scaleY = 1,
                                                               scaleZ = 1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);
  // Горизонтальное распределение: суммарное время = totalTime, с N стрелками => deltaX = totalTime / (N - 1)
  const count = vectors.length;
  const deltaX = count > 1 ? totalTime / (count - 1) : 0;

  // Начальная точка: берём startPoint и устанавливаем z = 1 (для отрисовки на графике)
  const initialPoint = startPoint.clone();
  initialPoint.z = 1;

  // Строим цепочку: P₀ = initialPoint, затем для каждого вектора Pᵢ₊₁ = Pᵢ + (deltaX, a_i * scaleY, b_i * scaleZ)
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = initialPoint.clone();
    vectors.forEach((vec, i) => {
      const offset = new THREE.Vector3(deltaX, vec[0] * scaleY, vec[1] * scaleZ);
      const nextPoint = currentPoint.clone().add(offset);
      // Фиксируем z = 1 для каждой точки
      currentPoint.z = 1;
      nextPoint.z = 1;
      const direction = offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
      chain.push({ start: currentPoint.clone(), end: nextPoint.clone(), direction });
      console.log(
        `Arrow ${i}: start=${currentPoint.toArray()}, offset=${offset.toArray()}, end=${nextPoint.toArray()}, direction=${direction.toArray()}`
      );
      currentPoint = nextPoint.clone();
    });
    return chain;
  }, [vectors, deltaX, scaleY, scaleZ, initialPoint]);

  // Масштаб для наконечников: можно уменьшать их при большом количестве векторов
  const coneScale = Math.max(0.3, Math.sqrt(5 / (count - 1)));
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
