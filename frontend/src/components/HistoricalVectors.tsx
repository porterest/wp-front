import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  vectors: Array<[number, number]>;
  totalTime?: number;
  accumulate?: boolean;
  aggregatorVector: THREE.Vector3; // <-- Новый проп
  scaleA?: number;
  scaleB?: number;
  color?: string;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color?: string;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, direction, color = "yellow" }) => {
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
                                                               aggregatorVector,
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = aggregatorVector.clone(); // <-- Начинаем с конца агрегатора

    for (let i = 0; i < count; i++) {
      const offset = new THREE.Vector3(
        vectors[i][1] * scaleA, // Смещение по оси транзакций
        vectors[i][0] * scaleB, // Смещение по оси цены
        delta
      );
      const nextPoint = currentPoint.clone().add(offset);

      const direction = offset.clone().normalize();
      chain.push({
        start: currentPoint.clone(),
        end: nextPoint.clone(),
        direction,
      });

      currentPoint = nextPoint.clone();
    }
    return chain;
  }, [vectors, count, delta, aggregatorVector, scaleA, scaleB]);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow key={i} start={arrow.start} end={arrow.end} direction={arrow.direction} color={color} />
      ))}
    </group>
  );
};

export default HistoricalVectors;