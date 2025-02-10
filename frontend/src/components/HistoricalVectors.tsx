// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты из three.js для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов, например: [[a, b], [a, b], …], где a и b – значения result vector */
  vectors: Array<[number, number]>;
  /**
   * Временной шаг между стрелками вдоль оси времени (ось X).
   * По умолчанию 1.
   */
  deltaTime?: number;
  /**
   * Коэффициент масштабирования для первой компоненты (ось Y).
   * По умолчанию 0.1.
   */
  scaleY?: number;
  /**
   * Коэффициент масштабирования для второй компоненты (ось Z).
   * По умолчанию 0.1.
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
    const defaultDir = new THREE.Vector3(0, 1, 0); // По умолчанию конус ориентирован вдоль оси Y
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
                                                               scaleY = 0.1,
                                                               scaleZ = 0.1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);

  // Располагаем стрелки вдоль временной оси (ось X).
  // Для стрелки i:
  //   стартовая точка = (i * deltaTime, 0, 1)
  //   смещение = (0, a * scaleY, b * scaleZ) (где [a, b] – элементы вектора)
  //   конечная точка = старт + смещение
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    vectors.forEach((vec, i) => {
      const start = new THREE.Vector3(i * deltaTime, 0, 1);
      const offset = new THREE.Vector3(0, vec[0] * scaleY, vec[1] * scaleZ);
      const end = start.clone().add(offset);
      const direction = offset.clone().normalize();
      chain.push({ start, end, direction });
      console.log(
        `Vector ${i}: start=${start.toArray()}, offset=${offset.toArray()}, end=${end.toArray()}, direction=${direction.toArray()}`
      );
    });
    return chain;
  }, [vectors, deltaTime, scaleY, scaleZ]);

  // Вычисляем масштаб для наконечников; пусть базовый масштаб равен 1 при 5 векторах,
  // и уменьшается при большем количестве, но не меньше 0.3.
  const coneScale = Math.max(0.3, Math.sqrt(5 / vectors.length));
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
