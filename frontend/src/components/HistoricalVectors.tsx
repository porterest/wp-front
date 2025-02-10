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
  /** Массив векторов, например: [[v0, v1], [v0, v1], …] – result vector для каждого элемента */
  vectors: Array<[number, number]>;
  /**
   * Начальная точка цепочки стрелок. По умолчанию (0, 0, 1) – в плоскости X–Y, z фиксирован 1.
   */
  startPoint?: THREE.Vector3;
  /**
   * Коэффициент масштабирования для первой компоненты result vector (ось X).
   * По умолчанию 1.
   */
  scaleX?: number;
  /**
   * Коэффициент масштабирования для второй компоненты result vector (ось Y).
   * По умолчанию 1.
   */
  scaleY?: number;
  /**
   * (Опционально) Если хотите задать фиксированный общий диапазон для цепочки, его можно передать здесь.
   * Если не задан, цепочка имеет суммарную длину равную сумме смещений.
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
    const defaultDir = new THREE.Vector3(0, 1, 0); // По умолчанию конус ориентирован вверх
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
                                                               startPoint = new THREE.Vector3(0, 0, 1),
                                                               scaleX = 1,
                                                               scaleY = 1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);

  // Начинаем с заданной стартовой точки (с z = 1)
  const adjustedStart = startPoint.clone();
  adjustedStart.z = 1;
  console.log("Adjusted startPoint:", adjustedStart.toArray());

  // Вычисляем общую цепочку: каждая стрелка строится как
  // P(i+1) = P(i) + offset, где offset = (v0*scaleX, v1*scaleY, 0)
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = adjustedStart.clone();
    vectors.forEach((vec, i) => {
      // Вычисляем смещение по входному вектору
      const offset = new THREE.Vector3(vec[0] * scaleX, vec[1] * scaleY, 0);
      const nextPoint = currentPoint.clone().add(offset);
      // Обязательно фиксируем z = 1
      currentPoint.z = 1;
      nextPoint.z = 1;
      // Если offset не нулевой, направление = normalize(offset)
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

  // Если totalChainLength задан, можно масштабировать всю цепочку, но здесь мы оставим её такой,
  // так что каждая стрелка имеет длину, равную смещению.
  // Вычисляем масштаб для наконечников – уменьшаем их размер при большом количестве векторов.
  const coneScale = Math.max(0.3, Math.sqrt(20 / vectors.length));
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
