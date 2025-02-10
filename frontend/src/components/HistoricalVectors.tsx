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
  /** Массив векторов, например: [[x, y], [x, y], …] */
  vectors: Array<[number, number]>;
  /**
   * Шаг по времени между стрелками (ось Y). По умолчанию 1.
   */
  deltaTime?: number;
  /**
   * Коэффициент масштабирования для первой компоненты result vector (ось X).
   * По умолчанию 1000.
   */
  scaleX?: number;
  /**
   * Коэффициент масштабирования для второй компоненты result vector (ось Z).
   * По умолчанию 60.
   */
  scaleZ?: number;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  /** Единичный вектор направления стрелки */
  direction: THREE.Vector3;
  color?: string;
  /** Масштаб для размеров наконечника стрелки */
  coneScale?: number;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, direction, color = "yellow", coneScale = 1 }) => {
  console.log("Rendering Arrow:");
  console.log("  start:", start.toArray());
  console.log("  end:", end.toArray());
  console.log("  direction:", direction.toArray());

  const lineGeometry = useMemo(() => {
    console.log("Creating LineGeometry for Arrow with start:", start.toArray(), "and end:", end.toArray());
    const geometry = new LineGeometry();
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    console.log("Creating LineMaterial for Arrow with color:", color);
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вдоль оси Y
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
    console.log("Computed cone quaternion:", quat);
    return quat;
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
                                                               deltaTime = 1,
                                                               scaleX = 1000,
                                                               scaleZ = 60,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);

  // Каждая стрелка будет рисоваться на своей временной позиции вдоль оси Y.
  // Фиксируем базовую точку: x = 0, y = i * deltaTime, z = 1.
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    vectors.forEach((vec, i) => {
      // Стартовая точка для вектора i
      const start = new THREE.Vector3(0, i * deltaTime, 1);
      // Смещение определяется масштабированными значениями входного вектора:
      // первая компонента result vector отображается по оси X, вторая – по оси Z.
      const offset = new THREE.Vector3(vec[0] * scaleX, 0, vec[1] * scaleZ);
      // Конечная точка: старт + смещение
      const end = start.clone().add(offset);
      // Направление – это нормализованный offset
      const direction = offset.clone().normalize();
      chain.push({ start, end, direction });
      console.log(`Vector ${i}: start=${start.toArray()}, offset=${offset.toArray()}, end=${end.toArray()}, direction=${direction.toArray()}`);
    });
    console.log("Computed arrowChain:", chain.map(item => ({
      start: item.start.toArray(),
      end: item.end.toArray(),
      direction: item.direction.toArray(),
    })));
    return chain;
  }, [vectors, deltaTime, scaleX, scaleZ]);

  // Вычисляем масштаб для наконечников. Можно уменьшать его при большом количестве векторов.
  const coneScale = Math.max(0.3, Math.sqrt(20 / vectors.length));
  console.log("Computed coneScale:", coneScale);

  return (
    <group>
      {arrowChain.map((arrow, index) => (
        <Arrow
          key={index}
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
