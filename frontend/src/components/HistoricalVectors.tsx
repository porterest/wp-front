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
  /** Массив векторов, например: [[a, b], [a, b], …] – значения result vector */
  vectors: Array<[number, number]>;
  /**
   * Параметр, задающий распределение стрелок по оси времени (ось Z).
   * Стрелки будут распределены равномерно от 0 до 5 (если N > 1).
   * По умолчанию 5.
   */
  totalTime?: number;
  /**
   * Коэффициент масштабирования для первой компоненты result vector (отображается по оси X).
   * По умолчанию 1.
   */
  scaleX?: number;
  /**
   * Коэффициент масштабирования для второй компоненты result vector (отображается по оси Y).
   * По умолчанию 1.
   */
  scaleY?: number;
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
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус ориентирован вверх
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
                                                               totalTime = 5,
                                                               scaleX = 1,
                                                               scaleY = 1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);

  const count = vectors.length;
  // Распределяем стрелки равномерно по оси Z от 0 до totalTime:
  const deltaZ = count > 1 ? totalTime / (count - 1) : 0;

  // Начальная точка цепочки (на оси времени — Z)
  // const startPoint = new THREE.Vector3(0, 0, 0); // время начинается с 0

  // Вычисляем масштаб для наконечников; пусть базовый масштаб равен 1 при 5 векторах,
  // и уменьшается при большем количестве, но не меньше 0.3
  const coneScale = Math.max(0.3, Math.sqrt(5 / (count - 1)));
  console.log("Computed coneScale:", coneScale);

  // Вычисляем цепочку стрелок:
  // Для стрелки i:
  //  - Начало: (0, 0, i * deltaZ)
  //  - Смещение по осям X и Y определяется входным вектором: offset = (a * scaleX, b * scaleY, 0)
  //  - Конечная точка: P(i+1) = P(i) + offset
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // let currentPoint = startPoint.clone();
    for (let i = 0; i < count; i++) {
      const vec = vectors[i];
      // Начало стрелки на оси времени: X=0, Y=0, Z = i * deltaZ
      const point = new THREE.Vector3(0, 0, i * deltaZ);
      // Смещение определяется входным вектором:
      const offset = new THREE.Vector3(vec[0] * scaleX, vec[1] * scaleY, 0);
      const nextPoint = point.clone().add(offset);
      // Направление стрелки – нормализованный offset (если offset нулевой, то направление по умолчанию)
      const direction = offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
      chain.push({
        start: point,
        end: nextPoint,
        direction,
      });
      console.log(
        `Arrow ${i}: start=${point.toArray()}, offset=${offset.toArray()}, end=${nextPoint.toArray()}, direction=${direction.toArray()}`
      );
    }
    console.log("Computed arrowChain:", chain.map(item => ({
      start: item.start.toArray(),
      end: item.end.toArray(),
      direction: item.direction.toArray(),
    })));
    return chain;
  }, [vectors, deltaZ, scaleX, scaleY]);

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
