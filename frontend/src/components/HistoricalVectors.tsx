import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
// (Используем useScale, если потребуется для других преобразований)
// import { useScale } from "../context/ScaleContext";

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
  console.log("HistoricalVectors received props:", {
    vectors,
    startPoint: startPoint.toArray(),
    totalChainLength,
  });

  // --- Локальная нормализация для исторических данных ---
  // Задаем min и max для графика (эти значения подберите под реальные данные)
  const minPriceForChart = 100;
  const maxPriceForChart = 140;
  const graphHeight = 5;
  const margin = 0.5;

  // Функция для нормализации цены в диапазон [margin, graphHeight - margin]
  const normalizePrice = (price: number) => {
    const ratio = (price - minPriceForChart) / (maxPriceForChart - minPriceForChart);
    return margin + ratio * (graphHeight - 2 * margin);
  };

  // Приводим startPoint к нужной плоскости: оставляем x, нормализуем y и принудительно z = 1
  const adjustedStart = startPoint.clone();
  adjustedStart.y = normalizePrice(startPoint.y);
  adjustedStart.z = 1;
  console.log("Adjusted startPoint:", adjustedStart.toArray());

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
      // Нормализуем только вторую компоненту (цена) с использованием локальной функции normalizePrice
      const normY = normalizePrice(vec[1]);
      console.log(`Normalized Y for index ${i}: ${normY}`);
      // Формируем вектор направления: X берем как есть, Y нормализуем, z = 0
      const direction = new THREE.Vector3(vec[0], normY, 0);
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
        console.log(`Vector at index ${i} had zero length. Defaulting direction to:`, direction.toArray());
      }
      direction.normalize();
      console.log(`Normalized direction for index ${i}:`, direction.toArray());
      const arrowEnd = currentStart.clone().add(direction.clone().multiplyScalar(arrowLength));
      // Принудительно устанавливаем z = 1 для корректного отображения поверх графика
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
