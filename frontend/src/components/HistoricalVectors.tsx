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
  // Создаем геометрию для линии (стрелки)
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    return geometry;
  }, [start, end]);

  // Материал для линии
  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color: color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  // Вычисляем кватернион для поворота наконечника (конуса).
  // По умолчанию конус ориентирован вдоль оси Y, поэтому поворачиваем его так, чтобы он смотрел по направлению стрелки.
  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      {/* Отрисовка линии стрелки */}
      <line2 geometry={lineGeometry} material={lineMaterial} />
      {/* Отрисовка наконечника стрелки – конуса */}
      <mesh position={end} quaternion={coneQuaternion}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               // Если startPoint не задан, используем (0, 0, 1); если задан, принудительно задаем z = 1
                                                               startPoint = new THREE.Vector3(0, 0, 1),
                                                               totalChainLength = 5,
                                                             }) => {
  // Если переданная startPoint имеет z = 0, принудительно делаем z = 1, чтобы стрелки отображались поверх
  const adjustedStart = startPoint.clone();
  adjustedStart.z = 1;

  // Вычисляем цепочку стрелок: делим totalChainLength на количество векторов,
  // и для каждой стрелки вычисляем конечную точку, прибавляя направление, умноженное на длину стрелки.
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (!vectors || vectors.length === 0) return chain;
    const count = vectors.length;
    const arrowLength = totalChainLength / count;
    let currentStart = adjustedStart.clone();
    for (let i = 0; i < count; i++) {
      const vec = vectors[i];
      // Создаем вектор направления из данных; фиксируем z = 0
      const direction = new THREE.Vector3(vec[0], vec[1], 0);
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
      }
      direction.normalize();
      // Вычисляем конечную точку стрелки
      const arrowEnd = currentStart.clone().add(direction.clone().multiplyScalar(arrowLength));
      // Принудительно устанавливаем z = 1 для корректного отображения
      currentStart.z = 1;
      arrowEnd.z = 1;
      chain.push({
        start: currentStart.clone(),
        end: arrowEnd.clone(),
        direction: direction.clone(),
      });
      currentStart = arrowEnd.clone();
    }
    console.log("Computed arrowChain:", chain);
    return chain;
  }, [vectors, adjustedStart, totalChainLength]);

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
