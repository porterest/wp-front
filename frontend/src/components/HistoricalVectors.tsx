import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  // Массив векторов-результатов в виде [price, transactions]
  vectors: Array<[number, number]>;
  totalTime?: number; // общая длина оси времени (например, 5)
  aggregatorVector?: THREE.Vector3; // базовый вектор, с которого начинается цепочка
  timeAxis?: "x" | "y" | "z"; // ось времени (по умолчанию "z")
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
  // Создаём геометрию линии
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    console.log("Координаты линии: начало вектора", start.toArray(), "конец вектора", end.toArray());
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  // Создаём материал для линии
  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  // Вычисляем кватернион для поворота конуса, чтобы он указывал по направлению стрелки
  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // базовое направление для конуса
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

  // Если цепочка состоит более чем из одного вектора, вычисляем шаг по оси времени (delta)
  const delta = count > 1 ? totalTime / (count - 1) : 0;
  // Масштаб для наконечников стрелок (можете подбирать по необходимости)
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;
  // Коэффициент масштабирования для значений price и transactions из векторов
  const scaleFactor = 0.01; // ПОДБЕРИТЕ ЭТО ЗНАЧЕНИЕ, чтобы historical vectors имели нужный размер

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // Используем переданный aggregatorVector целиком (если его нет – стартуем из (0,0,0))
    let currentPoint = aggregatorVector ? aggregatorVector.clone() : new THREE.Vector3(0, 0, 0);
    console.log("Начало цепочки (начало вектора):", currentPoint.toArray());
    for (let i = 0; i < count; i++) {
      console.log(`Входной вектор ${i}: [${vectors[i][0]}, ${vectors[i][1]}]`);
      // Вычисляем смещение.
      // Если timeAxis === "z", то прибавляем delta по оси Z,
      // а компоненты price и transactions (взятые из vectors) умножаем на scaleFactor.
      let offset: THREE.Vector3;
      if (timeAxis === "z") {
        offset = new THREE.Vector3(
          vectors[i][0] * scaleFactor,
          vectors[i][1] * scaleFactor,
          delta
        );
      } else if (timeAxis === "x") {
        offset = new THREE.Vector3(
          delta,
          vectors[i][0] * scaleFactor,
          vectors[i][1] * scaleFactor
        );
      } else if (timeAxis === "y") {
        offset = new THREE.Vector3(
          vectors[i][0] * scaleFactor,
          delta,
          vectors[i][1] * scaleFactor
        );
      } else {
        offset = new THREE.Vector3(
          vectors[i][0] * scaleFactor,
          vectors[i][1] * scaleFactor,
          delta
        );
      }
      console.log("Вектор смещения (offset):", offset.toArray());
      // Следующая точка цепочки – сумма текущей точки и offset
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
