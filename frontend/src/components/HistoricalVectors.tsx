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
  // Создаем геометрию линии от "начала вектора" до "конца вектора"
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
  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вверх
    console.log("Направление стрелки:", direction.toArray());
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      {/* Конус размещается в точке end */}
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
  const count = vectors.length;
  // Шаг по оси времени (delta) здесь используется для суммарного смещения по z между сегментами
  // const delta = count > 1 ? totalTime / (count - 1) : 0;
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  // Задаём желаемую длину каждого вектора (смещения)
  const desiredLength = totalTime/count; // Подберите это значение под вашу задачу

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // Стартовая точка: если aggregatorVector не передан, используем (0,0,1)
    let currentPoint = aggregatorVector ? aggregatorVector.clone() : new THREE.Vector3(0, 0, 1);
    console.log("Начало цепочки (начало вектора):", currentPoint.toArray());

    for (let i = 0; i < count; i++) {
      console.log(`Входной вектор ${i}: [${vectors[i][0]}, ${vectors[i][1]}]`);
      // Сохраняем горизонтальные координаты напрямую:
      // Предположим, что vectors[i][0] - это price (y), а vectors[i][1] - это transactions (x).
      const horizontalX = vectors[i][1];
      const horizontalY = vectors[i][0];
      // Вычисляем горизонтальную длину (без изменения)
      const horizontalLengthSquared = horizontalX * horizontalX + horizontalY * horizontalY;
      let computedZ = 0;
      if (desiredLength * desiredLength >= horizontalLengthSquared) {
        computedZ = Math.sqrt(desiredLength * desiredLength - horizontalLengthSquared);
      } else {
        // Если горизонтальная длина превышает desiredLength, оставляем z = 0
        // (либо можно масштабировать x и y, если нужно)
        computedZ = 0;
      }
      // Теперь задаем следующую точку: x и y из vectors, а z = currentPoint.z + computedZ.
      const nextPoint = new THREE.Vector3(horizontalX, horizontalY, currentPoint.z + computedZ);
      // Направление стрелки — нормализованный вектор от currentPoint до nextPoint.
      const direction = nextPoint.clone().sub(currentPoint).normalize();

      console.log(`Вектор ${i}: начало: ${currentPoint.toArray()}, конец: ${nextPoint.toArray()}`);
      console.log("Направление:", direction.toArray());
      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });
      currentPoint = nextPoint.clone();
    }
    return chain;
  }, [vectors, count, aggregatorVector]);

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
