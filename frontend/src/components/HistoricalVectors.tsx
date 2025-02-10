// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { useScale } from "../context/ScaleContext";

// Регистрируем классы для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов, например: [[x, y], [x, y], …] */
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
  // Создаем геометрию линии стрелки
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    return geometry;
  }, [start, end]);

  // Материал для линии стрелки
  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  // Вычисляем кватернион для поворота конуса (наконечника стрелки).
  // По умолчанию конус ориентирован вдоль оси Y, поэтому поворачиваем его по направлению стрелки.
  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      {/* Отрисовка линии стрелки через <line2> */}
      <line2 geometry={lineGeometry} material={lineMaterial} />
      {/* Отрисовка наконечника стрелки */}
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
  // Получаем функции нормализации из контекста
  const scale = useScale();

  // Приводим startPoint к нужной плоскости (например, z = 1)
  const adjustedStart = startPoint.clone();
  adjustedStart.z = 1;

  // Вычисляем цепочку стрелок: для каждого вектора нормализуем Y через useScale,
  // затем вычисляем направление и конечную точку стрелки.
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (!vectors || vectors.length === 0) return chain;
    const count = vectors.length;
    const arrowLength = totalChainLength / count;
    let currentStart = adjustedStart.clone();
    for (let i = 0; i < count; i++) {
      const vec = vectors[i];
      // Нормализуем только вторую компоненту (например, цену) с помощью функции normalizeY
      const normalizedY = scale.normalizeY(vec[1]);
      // Сохраняем первую компоненту (например, объём или другую характеристику) как есть
      const normalizedVec = new THREE.Vector3(vec[0], normalizedY, 0);
      if (normalizedVec.length() === 0) {
        normalizedVec.set(1, 0, 0);
      }
      normalizedVec.normalize();
      const arrowEnd = currentStart.clone().add(normalizedVec.clone().multiplyScalar(arrowLength));
      // Устанавливаем z = 1 для корректного отображения поверх плоскостей
      currentStart.z = 1;
      arrowEnd.z = 1;
      chain.push({
        start: currentStart.clone(),
        end: arrowEnd.clone(),
        direction: normalizedVec.clone(),
      });
      currentStart = arrowEnd.clone();
    }
    console.log("Computed arrowChain:", chain);
    return chain;
  }, [vectors, adjustedStart, totalChainLength, scale]);

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
