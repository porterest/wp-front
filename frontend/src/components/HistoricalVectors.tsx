// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем классы для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов, например: [[x1, y1], [x2, y2], …] */
  vectors: Array<[number, number]>;
  /** Точка, откуда начинается цепочка стрелок (по умолчанию (0, 0, 1)) */
  startPoint?: THREE.Vector3;
  /**
   * Общая длина цепочки. Цепочка растягивается от startPoint до startPoint + totalChainLength.
   * По умолчанию 5.
   */
  totalChainLength?: number;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  /** Нормализованный вектор направления стрелки */
  direction: THREE.Vector3;
  color?: string;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, direction, color = "yellow" }) => {
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color: color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // Конус по умолчанию смотрит вдоль оси Y
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      {/* Используем зарегистрированный JSX-компонент <line2> */}
      <line2 geometry={lineGeometry} material={lineMaterial} />
      <mesh position={end} quaternion={coneQuaternion}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               startPoint = new THREE.Vector3(0, 0, 1),
                                                               totalChainLength = 5,
                                                             }) => {
  // Делим общую длину цепочки на количество векторов
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (!vectors || vectors.length === 0) return chain;
    const count = vectors.length;
    const arrowLength = totalChainLength / count;
    let currentStart = startPoint.clone();
    for (let i = 0; i < count; i++) {
      const vec = vectors[i];
      // Создаем вектор направления (фиксируем z = 0)
      const direction = new THREE.Vector3(vec[0], vec[1], 0);
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
      }
      direction.normalize();
      const arrowEnd = currentStart.clone().add(direction.clone().multiplyScalar(arrowLength));
      chain.push({
        start: currentStart.clone(),
        end: arrowEnd.clone(),
        direction: direction.clone(),
      });
      currentStart = arrowEnd.clone();
    }
    return chain;
  }, [vectors, startPoint, totalChainLength]);

  return (
    <group>
      {arrowChain.map((arrow, index) => (
        <Arrow
          key={index}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color="yellow"
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
