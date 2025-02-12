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
 * - aggregatorVector: базовый вектор для агрегирования (например, результат предыдущего блока)
 * - timeAxis: ось, отвечающая за время (по умолчанию "z")
 * - color: цвет стрелок
 */
interface HistoricalVectorsProps {
  vectors: Array<[number, number]>;
  totalTime?: number;
  aggregatorVector?: THREE.Vector3;
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
  // Создаем геометрию линии от "начала вектора" (start) до "конца вектора" (end)
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    console.log("Координаты линии: начало вектора", start.toArray(), "конец вектора", end.toArray());
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  // Создаем материал для линии
  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  // Вычисляем кватернион для ориентации конуса (наконечника стрелки)
  // Здесь конус поворачивается так, чтобы его направление совпадало с направлением (end - start)
  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вверх
    console.log(direction)
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      {/* Здесь конус устанавливается в точке "конец вектора" (end) */}
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

  // Вычисляем масштаб для наконечников (coneScale)
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;
  // Расчет шага по оси времени (delta) - равномерное распределение по totalTime
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  // Формируем цепочку стрелок (векторов)
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // Используем aggregatorVector, если он передан, иначе задаем дефолтный вектор (0,0,1)
    let currentPoint = aggregatorVector ? aggregatorVector.clone() : new THREE.Vector3(0, 0, 1);
    console.log("Начало цепочки (начало вектора):", currentPoint.toArray());

    for (let i = 0; i < count; i++) {
      console.log('Входной вектор ${i}: [${vectors[i][0]}, ${vectors[i][1]}]');
      // Сначала вычисляем "сырую" точку, используя входные данные и шаг по оси времени
      const rawPoint = new THREE.Vector3(vectors[i][1], vectors[i][0], currentPoint.z + delta);
      // Вычисляем направление от currentPoint до rawPoint
      const direction = rawPoint.clone().sub(currentPoint).normalize();
      // Задаем длину стрелки равной 2: конечная точка = currentPoint + (direction * 2)
      const nextPoint = currentPoint.clone().add(direction.clone().setLength(delta));

      console.log(
        'Вектор ${i}: начало вектора: ${currentPoint.toArray()}, конец вектора: ${nextPoint.toArray()}'
    );
      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });
      console.log("координаты вектора", currentPoint.toArray(), nextPoint.toArray(), direction.toArray());
      currentPoint = nextPoint.clone();
    }
    return chain;
  }, [vectors, count, delta, timeAxis, aggregatorVector]);

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