import React, { useMemo, useEffect, useRef } from "react";
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
   * Общая длина цепочки по оси времени.
   * Например, если totalTime = 4.5 и стрелок 5, то между стрелками шаг по Z будет 4.5/4 ≈ 1.125.
   */
  totalTime?: number;
  /**
   * Если true – каждая стрелка строится цепочкой (следующая начинается от конца предыдущей);
   * если false – каждая стрелка отрисовывается независимо, начиная от startPoint, а смещение по Z растёт как i*delta.
   */
  accumulate?: boolean;
  /** Начальная точка (конец агрегированного вектора, например, с z = 1) */
  startPoint: THREE.Vector3;
  /** Масштаб для смещения по оси транзакций (x) */
  scaleA?: number;
  /** Масштаб для смещения по оси цены (y) */
  scaleB?: number;
  /** Цвет стрелок */
  color?: string;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}

/**
 * Компонент Arrow отрисовывает одну стрелку: линию от start до end и конус-стрелку на конце,
 * повернутый в направлении (end - start).
 */
const Arrow: React.FC<ArrowProps> = ({ start, end, color }) => {
  // Вычисляем вектор направления стрелки
  const direction = useMemo(() => new THREE.Vector3().subVectors(end, start), [start, end]);

  // Создаем геометрию линии
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

  // Создаем конус (головку стрелки)
  const coneRef = useRef<THREE.Mesh>(null);
  const coneGeometry = useMemo(() => new THREE.ConeGeometry(0.1, 0.3, 12), []);
  const coneMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color }), [color]);

  // Поворачиваем конус так, чтобы он указывал в направлении стрелки.
  useEffect(() => {
    if (coneRef.current) {
      // По умолчанию конус направлен вдоль оси Y (0, 1, 0)
      const arrowDir = direction.clone().normalize();
      if (arrowDir.lengthSq() > 0) {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDir);
        coneRef.current.setRotationFromQuaternion(quaternion);
      }
    }
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      <mesh
        ref={coneRef}
        geometry={coneGeometry}
        material={coneMaterial}
        position={[end.x, end.y, end.z]}
      />
    </group>
  );
};

/**
 * HistoricalVectors отрисовывает набор стрелок, отражающих исторические данные.
 * Важно: смещение по осям рассчитывается так:
 *
 * - X: vectors[i][1] * scaleA (ось транзакций)
 * - Y: vectors[i][0] * scaleB (ось цены)
 * - Z: либо delta (если accumulate=true) либо i*delta (если accumulate=false)
 *
 * delta рассчитывается как totalTime/(count-1)
 */
const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               totalTime = 4.5,
                                                               accumulate = false,
                                                               startPoint,
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;
  // Если стрелок больше одного – шаг по оси Z:
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  // Собираем массив стрелок
  const arrows = useMemo(() => {
    const result: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    let currentStart = startPoint.clone();
    for (let i = 0; i < count; i++) {
      // ВАЖНО: используем именно такой порядок –
      // offset.x = vectors[i][1] * scaleA (смещение по транзакциям),
      // offset.y = vectors[i][0] * scaleB (смещение по цене),
      // offset.z = (accumulate ? delta : i * delta)
      const offset = new THREE.Vector3(
        vectors[i][1] * scaleA,
        vectors[i][0] * scaleB,
        accumulate ? delta : i * delta
      );
      const arrowEnd = currentStart.clone().add(offset);
      result.push({ start: currentStart.clone(), end: arrowEnd.clone() });
      if (accumulate) {
        // Если строим цепочку, следующая стрелка начинается с конца предыдущей
        currentStart = arrowEnd.clone();
      }
    }
    return result;
  }, [vectors, count, startPoint, scaleA, scaleB, delta, accumulate]);

  return (
    <group>
      {arrows.map((arrow, index) => (
        <Arrow key={index} start={arrow.start} end={arrow.end} color={color} />
      ))}
    </group>
  );
};

export default HistoricalVectors;
