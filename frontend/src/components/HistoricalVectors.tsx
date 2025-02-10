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
                                                               startPoint = new THREE.Vector3(0, 0, 1),
                                                               totalChainLength = 5,
                                                             }) => {
  console.log("HistoricalVectors received props:", {
    vectors,
    startPoint: startPoint.toArray(),
    totalChainLength,
  });

  // Коэффициенты масштабирования:
  const xScale = 1000; // Увеличиваем горизонтальное смещение
  const yScale = 60;   // Делим цену на этот коэффициент, чтобы привести её к диапазону графика

  // Приводим стартовую точку: оставляем x, нормализуем y, z = 1.
  const adjustedStart = new THREE.Vector3(startPoint.x, startPoint.y / yScale, 1);
  console.log("Adjusted startPoint:", adjustedStart.toArray());

  // Вычисляем масштаб для наконечников: чем больше векторов, тем меньше размер
  const coneScale = Math.sqrt(5 / vectors.length);
  console.log("Computed coneScale:", coneScale);

  const arrowChain = useMemo(() => {
    console.log("Computing arrowChain with vectors:", vectors);
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (!vectors || vectors.length === 0) {
      console.log("No vectors provided, returning empty chain.");
      return chain;
    }
    const count = vectors.length;
    const arrowLength = totalChainLength / count;
    console.log(`TotalChainLength: ${totalChainLength}, count: ${count}, computed arrowLength: ${arrowLength}`);
    let currentStart = adjustedStart.clone();
    for (let i = 0; i < count; i++) {
      console.log(`Processing vector index ${i}:`, vectors[i]);
      const vec = vectors[i];
      // Масштабируем входные данные:
      const scaledX = vec[0] * xScale;
      const scaledY = vec[1] / yScale;
      console.log(`Scaled components for index ${i}: x=${scaledX}, y=${scaledY}`);
      // Вычисляем угол на основе масштабированных значений:
      const angle = Math.atan2(scaledY, scaledX);
      console.log(`Computed angle for index ${i}: ${angle} rad (${(angle * 180) / Math.PI}°)`);
      // Создаем единичный вектор направления по этому углу:
      const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
      direction.normalize();
      console.log(`Normalized direction for index ${i}:`, direction.toArray());
      const arrowEnd = currentStart.clone().add(direction.clone().multiplyScalar(arrowLength));
      // Устанавливаем z = 1 для обеих точек:
      currentStart.z = 1;
      arrowEnd.z = 1;
      console.log(`Arrow ${i} computed start:`, currentStart.toArray(), "end:", arrowEnd.toArray());
      chain.push({
        start: currentStart.clone(),
        end: arrowEnd.clone(),
        direction: direction.clone(),
      });
      currentStart = arrowEnd.clone();
    }
    console.log("Computed arrowChain:", chain.map(item => ({
      start: item.start.toArray(),
      end: item.end.toArray(),
      direction: item.direction.toArray(),
    })));
    return chain;
  }, [vectors, adjustedStart, totalChainLength, xScale, yScale]);

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
