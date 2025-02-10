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
   * Временной шаг между стрелками (ось Y). Каждая стрелка будет рисоваться в точке (0, i*deltaTime, 1).
   * По умолчанию 1.
   */
  deltaTime?: number;
  /**
   * Коэффициент масштабирования для входного result vector (одинаковый для обеих компонент).
   * По умолчанию 1.
   */
  scaleFactor?: number;
  /**
   * (Опционально) Общая длина цепочки – если хотите, чтобы вся цепочка имела фиксированную длину.
   * Если не задан, используется просто положение стрелок по времени.
   */
  totalChainLength?: number;
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
    const defaultDir = new THREE.Vector3(0, 1, 0);
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
                                                               scaleFactor = 1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);

  // Каждый historical-вектор будет использоваться для задания смещения по осям X и Z.
  // Стартовая точка для стрелки i: (0, i * deltaTime, 1)
  // Смещение = (vec[0]*scaleFactor, 0, vec[1]*scaleFactor)
  // Таким образом, направление стрелки соответствует направлению от (0,0) до (vec[0], vec[1]),
  // а временной компонент (ось Y) определяется её порядковым номером.
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    vectors.forEach((vec, i) => {
      const start = new THREE.Vector3(0, i * deltaTime, 1);
      const offset = new THREE.Vector3(vec[0] * scaleFactor, 0, vec[1] * scaleFactor);
      const end = start.clone().add(offset);
      const direction = offset.clone().normalize();
      chain.push({ start, end, direction });
      console.log(`Vector ${i}: start=${start.toArray()}, offset=${offset.toArray()}, end=${end.toArray()}, direction=${direction.toArray()}`);
    });
    return chain;
  }, [vectors, deltaTime, scaleFactor]);

  // Если задан totalChainLength, можно масштабировать все смещения так, чтобы общая длина цепочки была равна totalChainLength.
  // Например, вычисляем текущую общую длину по оси Y (или по сумме длины смещений) и затем масштабируем offset.
  // Здесь покажем базовый вариант без дополнительного масштабирования, но его можно расширить.

  // Вычисляем масштаб для наконечников; например, уменьшаем размер при большом количестве векторов.
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
