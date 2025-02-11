import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов в формате [priceDelta, transactionDelta] */
  vectors: Array<[number, number]>;
  /**
   * Общая длительность цепочки по оси времени.
   * Используется для расчёта смещения по оси Z: delta = totalTime/(count-1)
   */
  totalTime?: number;
  /** Если true, то каждая стрелка начинается от конца предыдущей (накопительный эффект),
   * иначе каждая стрелка отрисовывается от startPoint.
   */
  accumulate?: boolean;
  /** Начальная точка цепочки (конец агрегированного вектора) */
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

  return <line2 geometry={lineGeometry} material={lineMaterial} />;
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               totalTime = 4.5,
                                                               accumulate = true,
                                                               startPoint,
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;
  // Вычисляем смещение по оси времени: если в цепочке более одного вектора, то
  // delta = totalTime / (count - 1), иначе 0.
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = startPoint.clone(); // Начинаем с переданной точки (конца агрегатора)

    for (let i = 0; i < count; i++) {
      // Порядок расчёта смещений:
      // - Ось X: vectors[i][1] * scaleA (смещение по транзакциям)
      // - Ось Y: vectors[i][0] * scaleB (смещение по цене)
      // - Ось Z: смещение по времени = delta
      const offset = new THREE.Vector3(
        vectors[i][1] * scaleA,
        vectors[i][0] * scaleB,
        delta
      );
      const nextPoint = currentPoint.clone().add(offset);
      const direction = offset.lengthSq() > 0 ? offset.clone().normalize() : new THREE.Vector3(0, 1, 0);

      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });

      // Если accumulate === true, следующая стрелка начинается от конца предыдущей.
      // Иначе каждая стрелка стартует с одной и той же точки startPoint.
      currentPoint = accumulate ? nextPoint.clone() : startPoint.clone();
    }
    return chain;
  }, [vectors, count, delta, startPoint, scaleA, scaleB, accumulate]);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow key={i} start={arrow.start} end={arrow.end} direction={arrow.direction} color={color} />
      ))}
    </group>
  );
};

export default HistoricalVectors;
