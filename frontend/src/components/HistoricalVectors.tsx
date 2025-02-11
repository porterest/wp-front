import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов в формате [transactionDelta, priceDelta] */
  vectors: Array<[number, number]>;
  /** Общая длительность (не используется для смещения по Z, оставляем для совместимости) */
  totalTime?: number;
  /** Если true – смещения накапливаются, иначе каждый вектор отрисовывается от начальной точки */
  accumulate?: boolean;
  /** Начальная точка, обычно это конец агрегированного вектора (BetLines) */
  startPoint: THREE.Vector3;
  /** Масштаб для смещения по оси транзакций (X) */
  scaleA?: number;
  /** Масштаб для смещения по оси цены (Y) */
  scaleB?: number;
  /** Цвет стрелок */
  color?: string;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, color = "yellow" }) => {
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([
      start.x, start.y, start.z,
      end.x, end.y, end.z
    ]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
  }, [color]);

  return <line2 geometry={lineGeometry} material={lineMaterial} />;
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               accumulate = true,
                                                               startPoint,
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               color = "yellow",
                                                             }) => {
  // Общее число исторических векторов
  const count = vectors.length;

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    // Начинаем именно с переданной точки (конца агрегатора)
    let currentPoint = startPoint.clone();

    for (let i = 0; i < count; i++) {
      // Предполагаем, что каждый вектор имеет вид [transactionDelta, priceDelta].
      // Таким образом, ось X (транзакции) смещается на vectors[i][0] * scaleA,
      // а ось Y (цена) – на vectors[i][1] * scaleB.
      // Ось Z фиксирована (например, равна 0), чтобы все объекты лежали на одной плоскости.
      const offset = new THREE.Vector3(
        vectors[i][0] * scaleA, // смещение по X (транзакции)
        vectors[i][1] * scaleB, // смещение по Y (цена)
        0                     // смещение по Z – оставляем на уровне startPoint
      );

      const nextPoint = currentPoint.clone().add(offset);

      const direction = offset.lengthSq() > 0
        ? offset.clone().normalize()
        : new THREE.Vector3(0, 1, 0);

      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });

      // Если накапливаем смещения, следующая стрелка будет идти от конца предыдущей
      // Иначе каждая стрелка начинается от startPoint
      currentPoint = accumulate ? nextPoint.clone() : startPoint.clone();
    }

    return chain;
  }, [vectors, count, startPoint, scaleA, scaleB, accumulate]);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color={color}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
