import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

/**
 * Свойства компонента HistoricalVectors:
 * - vectors: массив векторов-результатов для блока в виде [price, transactions]
 * - totalTime: общая длина оси времени (по умолчанию 5)
 * - start: базовый вектор для агрегирования (например, результат предыдущего блока)
 * - timeAxis: ось, отвечающая за время (по умолчанию "z")
 * - color: цвет стрелок
 */
interface HistoricalVectorsProps {
  vectors: Array<[number, number]>;
  totalTime?: number;
  start?: THREE.Vector3;
  timeAxis?: "x" | "y" | "z";
  color?: string;
}

/**
 * Свойства для стрелки (Arrow):
 * - start: начальная точка стрелки ("начало вектора")
 * - end: конечная точка стрелки ("конец вектора")
 * - direction: направление стрелки (вычисляется как разность end - start, нормализованная)
 * - color: цвет стрелки
 * - coneScale: масштаб наконечника стрелки
 */
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
  // Создаем геометрию линии от "начала вектора" до "конца вектора"
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    console.log(
      "Координаты линии: начало вектора",
      start.toArray(),
      "конец вектора",
      end.toArray(),
    );
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  // Создаем материал для линии
  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,

      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      transparent: true,
      opacity: 0.5,
    });
  }, [color]);

  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вверх
    console.log("Направление стрелки:", direction.toArray());

    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      <mesh position={end} quaternion={coneQuaternion}>
        <coneGeometry args={[0.1 * coneScale, 0.3 * coneScale, 12]} />

        <meshStandardMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
  vectors,
  start,
  totalTime = 5,
  color = "yellow",
}) => {
  console.log("vectors");
  console.log(vectors);
  const count = vectors.length;
  const delta = count > 1 ? totalTime / (count - 1) : 0;
  const computedConeScale =
    count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  const minValueX = Math.min(...vectors.map((x) => x[0]));
  const maxValueX = Math.max(...vectors.map((x) => x[0]));
  const minValueY = Math.min(...vectors.map((x) => x[1]));
  const maxValueY = Math.max(...vectors.map((x) => x[1]));

  const minX = 0;
  const maxX = 5;
  const minY = 0;
  const maxY = 5;

  const normalizeX = (x: number) => {
    const range = maxValueX - minValueX;
    if (range === 0) return 2; // или другое значение по умолчанию
    return ((x - minValueX) / range) * (maxX - minX) + minX;
  };

  const normalizeY = (y: number) => {
    const range = maxValueY - minValueY;
    if (range === 0) return 2; // или другое значение по умолчанию
    return ((y - minValueY) / range) * (maxY - minY) + minY;
  };

  const normalizeArrow = (arrow: [number, number]) => {
    const newX = normalizeX(arrow[0]);
    const newY = normalizeY(arrow[1]);
    return [newX, newY];
  };

  const arrowChain = useMemo(() => {
    const chain: {
      start: THREE.Vector3;
      end: THREE.Vector3;
      direction: THREE.Vector3;
    }[] = [];
    let currentPoint = start ? start.clone() : new THREE.Vector3(0, 0, 1);
    console.log("Начало цепочки (начало вектора):", currentPoint.toArray());

    for (let i = 0; i < count; i++) {
      console.log(`Входной вектор ${i}: [${vectors[i][0]}, ${vectors[i][1]}]`);
      const newArrow = normalizeArrow(vectors[i]);
      const horizontal = new THREE.Vector2(newArrow[1], newArrow[0]);
      const nextPoint = new THREE.Vector3(
        horizontal.x,
        horizontal.y,
        currentPoint.z + delta,
      );
      const direction = nextPoint.clone().sub(currentPoint).normalize();

      console.log(
        `Вектор ${i}: начало: ${currentPoint.toArray()}, конец: ${nextPoint.toArray()}`,
      );
      console.log(
        "координаты вектора",
        currentPoint.toArray(),
        nextPoint.toArray(),
        direction.toArray(),
      );
      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });
      currentPoint = nextPoint.clone();
    }
    return chain;
  }, [vectors, count, delta, start]);

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
