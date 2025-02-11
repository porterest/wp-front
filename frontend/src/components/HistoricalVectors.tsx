import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  vectors: Array<[number, number]>;
  totalTime?: number;
  aggregatorVector?: THREE.Vector3;
  timeAxis?: "x" | "y" | "z";
  color?: string;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
  coneScale?: number;
}

const Arrow: React.FC<ArrowProps> = ({
                                       start,
                                       end,
                                       direction,
                                       color = "yellow",
                                       coneScale = 1,
                                     }) => {
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    console.log("Координаты линии: начало вектора", start.toArray(), "конец вектора", end.toArray());
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0);
    console.log("Направление стрелки:", direction.toArray());
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
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
                                                               aggregatorVector,
                                                               totalTime = 5,
                                                               timeAxis = "z",
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;

  // Вычисляем масштаб для наконечников (конуса)
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;
  // Шаг по оси времени (например, если totalTime = 5)
  const delta = count > 1 ? totalTime / (count - 1) : 0;
  // Коэффициент масштабирования для price и transactions (подберите значение, чтобы стрелки были нужной длины)
  const scaleFactor = 0.01; // ← ПОДБЕРИТЕ ЭТО ЗНАЧЕНИЕ

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // Стартовая точка – берём агрегатор как есть; если он не передан – (0,0,1)
    let currentPoint = aggregatorVector ? aggregatorVector.clone() : new THREE.Vector3(0, 0, 1);
    console.log("Начало цепочки (начало вектора):", currentPoint.toArray());
    for (let i = 0; i < count; i++) {
      console.log(`Входной вектор ${i}: [${vectors[i][0]}, ${vectors[i][1]}]`);
      // Применяем scaleFactor к первым двум компонентам, оставляя шаг по времени (delta)
      const offset = new THREE.Vector3(
        vectors[i][0] * scaleFactor,
        vectors[i][1] * scaleFactor,
        delta
      );
      console.log("Вектор смещения (offset):", offset.toArray());
      const nextPoint = currentPoint.clone().add(offset);
      console.log(`Вектор ${i}: начало: ${currentPoint.toArray()}, конец: ${nextPoint.toArray()}`);
      const direction = nextPoint.clone().sub(currentPoint).normalize();
      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });
      console.log("Координаты вектора:", currentPoint.toArray(), nextPoint.toArray(), direction.toArray());
      currentPoint = nextPoint.clone();
    }
    return chain;
  }, [vectors, count, delta, aggregatorVector, timeAxis, scaleFactor]);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color={color}
          coneScale={computedConeScale}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
