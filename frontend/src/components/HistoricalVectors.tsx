import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов в формате [transactionDelta, priceDelta] */
  vectors: Array<[number, number]>;
  /**
   * Общая длительность цепочки (ограничение по длине по оси времени).
   * Для 5 стрелок с totalTime=4.5 разница по Z будет ≈1.125
   */
  totalTime?: number;
  /**
   * Если true – стрелки строятся цепочкой (каждая начинается с конца предыдущей),
   * если false – каждая стрелка начинается от startPoint (агрегатора)
   */
  accumulate?: boolean;
  /** Начальная точка (конец агрегированного вектора) */
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
  color?: string;
}

/**
 * Компонент отрисовывает стрелку в виде линии с конусом на конце.
 */
const ArrowWithCone: React.FC<ArrowProps> = ({ start, end, color = "yellow" }) => {
  // Вычисляем вектор направления (от start к end)
  const direction = useMemo(() => {
    return new THREE.Vector3().subVectors(end, start);
  }, [start, end]);

  // Геометрия линии
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
  }, [color]);

  // Геометрия и материал конуса (стрелочного наконечника)
  const coneGeometry = useMemo(() => new THREE.ConeGeometry(0.1, 0.3, 12), []);
  const coneMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color }), [color]);
  const coneRef = useRef<THREE.Mesh>(null);

  // После рендера поворачиваем конус так, чтобы он указывал в направлении стрелки.
  useEffect(() => {
    if (coneRef.current) {
      // По умолчанию конус направлен вдоль оси Y (0,1,0)
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const arrowDir = direction.clone().normalize();
      if (arrowDir.lengthSq() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, arrowDir);
        coneRef.current.setRotationFromQuaternion(quat);
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
 * HistoricalVectors отрисовывает набор стрелок, отражающих исторические значения.
 * Если accumulate === false, каждая стрелка отрисовывается от startPoint,
 * а её длина и смещение по Z вычисляются независимо с использованием totalTime.
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
  // Если стрелок несколько, рассчитываем шаг по оси времени (ось Z)
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    for (let i = 0; i < count; i++) {
      let offset: THREE.Vector3;
      if (accumulate) {
        // Если цепочка: каждый следующий вектор складывается с предыдущим
        offset = new THREE.Vector3(
          vectors[i][0] * scaleA,
          vectors[i][1] * scaleB,
          delta
        );
        if (i === 0) {
          const start = startPoint.clone();
          const end = start.clone().add(offset);
          chain.push({ start, end });
        } else {
          const start = chain[i - 1].end.clone();
          const end = start.clone().add(offset);
          chain.push({ start, end });
        }
      } else {
        // Если не цепочка: каждая стрелка начинается от startPoint,
        // а смещение по Z растёт пропорционально индексу
        offset = new THREE.Vector3(
          vectors[i][0] * scaleA,
          vectors[i][1] * scaleB,
          i * delta
        );
        const start = startPoint.clone();
        const end = start.clone().add(offset);
        chain.push({ start, end });
      }
    }
    return chain;
  }, [vectors, count, startPoint, scaleA, scaleB, delta, accumulate]);

  return (
    <group>
      {arrowChain.map((arrow, index) => (
        <ArrowWithCone
          key={index}
          start={arrow.start}
          end={arrow.end}
          color={color}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;
