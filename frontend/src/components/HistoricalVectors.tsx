// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { useScale } from "../context/ScaleContext";

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
                                                               color = "yellow",
                                                             }) => {


  // Формируем цепочку стрелок (векторов)
  const { normalizeY, normalizeZ } = useScale(); // или еще normalizeX, если понадобится
  const count = vectors.length;

  // Расчет шага по оси времени (delta)
  const delta = count > 1 ? totalTime / (count - 1) : 0;
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = aggregatorVector ? aggregatorVector.clone() : new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < count; i++) {
      // Предположим, что:
      // - vectors[i][0] - цена, которую нужно нормализовать через normalizeY (ось Y)
      // - vectors[i][1] - значение объёма или транзакций, которое можно нормализовать через normalizeZ (ось X или Z)
      const normalizedPrice = normalizeY(vectors[i][0]);
      // Если значение транзакций нужно нормализовать, нужно знать максимум. Если он известен (например, maxVolume),
      // то:
      // const normalizedTransactions = normalizeZ(vectors[i][1], maxVolume);
      // Если нормализация для второго параметра не требуется или она другая — подставьте нужную функцию.
      // Допустим, для примера, возьмём его как есть:
      const normalizedTransactions = vectors[i][1]; // или нормализуйте, если нужно

      // Собираем смещение, при этом ось времени (delta) остаётся неизменной.
      // Возможно, стоит уточнить, какой осью является цена, а какой — объём. В CandlestickChart цена идет по Y,
      // объем (или транзакции) — по X (или Z). Здесь пример: X = normalizedTransactions, Y = normalizedPrice, Z = delta.
      const offset = new THREE.Vector3(normalizedTransactions, normalizedPrice, delta);

      const nextPoint = currentPoint.clone().add(offset);
      const direction = nextPoint.clone().sub(currentPoint).normalize();
      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });
      currentPoint = nextPoint.clone();
    }
    return chain;
  }, [vectors, count, delta, aggregatorVector, normalizeY, normalizeZ]);

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
