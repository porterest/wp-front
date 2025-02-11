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
  startPoint?: THREE.Vector3;
  timeAxis?: "x" | "y" | "z";
  scaleA?: number;
  scaleB?: number;
  color?: string;
}

const clampVectorExcludingAxis = (
  v: THREE.Vector3,
  min: number,
  max: number,
  excludeAxis: "x" | "y" | "z"
): THREE.Vector3 =>
  new THREE.Vector3(
    excludeAxis === "x" ? v.x : Math.min(max, Math.max(min, v.x)),
    excludeAxis === "y" ? v.y : Math.min(max, Math.max(min, v.y)),
    excludeAxis === "z" ? v.z : Math.min(max, Math.max(min, v.z))
  );

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
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);
  const lineMaterial = useMemo(
    () =>
      new LineMaterial({
        color,
        linewidth: 2,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      }),
    [color]
  );
  const coneQuaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
    [direction]
  );
  const coneGeom = useMemo(() => new THREE.ConeGeometry(0.1 * coneScale, 0.3 * coneScale, 12), [coneScale]);
  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      <mesh position={end} quaternion={coneQuaternion}>
        <primitive object={coneGeom} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               totalTime = 4.5,
                                                               accumulate = true,
                                                               startPoint = new THREE.Vector3(0, 0, 0),
                                                               timeAxis = "z",
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               color = "yellow",
                                                             }) => {
  const count = vectors.length;
  const fixedPrice = 0.38313094359425115;
  const fixedTransaction = 0;
  const computedConeScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;
  const coneHeight = 0.3 * computedConeScale;
  const delta = timeAxis === "z"
    ? count > 1 ? (totalTime - coneHeight) / (count - 1) : 0
    : count > 1 ? totalTime / (count - 1) : 0;
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    if (timeAxis === "z") {
      let currentPoint = new THREE.Vector3(fixedTransaction, fixedPrice, 0);
      for (let i = 0; i < count; i++) {
        const offset = new THREE.Vector3(0, 0, delta);
        const nextPoint = currentPoint.clone().add(offset);
        const direction = new THREE.Vector3(0, 0, 1);
        chain.push({ start: currentPoint.clone(), end: nextPoint.clone(), direction });
        currentPoint = nextPoint.clone();
      }
    } else {
      const allAxes: ("x" | "y" | "z")[] = ["x", "y", "z"];
      const offsetAxes = allAxes.filter((ax) => ax !== timeAxis) as ("x" | "y" | "z")[];
      if (accumulate) {
        let currentPoint = clampVectorExcludingAxis(startPoint.clone(), 0, 5, timeAxis);
        for (let i = 0; i < count; i++) {
          const offset = new THREE.Vector3(0, 0, delta);
          offset[offsetAxes[0]] = vectors[i][1] * scaleA;
          offset[offsetAxes[1]] = vectors[i][0] * scaleB;
          const nextPoint = currentPoint.clone().add(offset);
          const clampedStart = clampVectorExcludingAxis(currentPoint.clone(), 0, 5, timeAxis);
          const clampedEnd = clampVectorExcludingAxis(nextPoint.clone(), 0, 5, timeAxis);
          const direction = offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
          chain.push({ start: clampedStart, end: clampedEnd, direction });
          currentPoint = nextPoint.clone();
        }
      } else {
        for (let i = 0; i < count; i++) {
          const basePoint = startPoint.clone();
          basePoint[timeAxis] = i * delta;
          const offset = new THREE.Vector3(0, 0, delta);
          offset[offsetAxes[0]] = vectors[i][1] * scaleA;
          offset[offsetAxes[1]] = vectors[i][0] * scaleB;
          const endPoint = basePoint.clone().add(offset);
          const clampedBase = clampVectorExcludingAxis(basePoint, 0, 5, timeAxis);
          const clampedEnd = clampVectorExcludingAxis(endPoint, 0, 5, timeAxis);
          const direction = offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
          chain.push({ start: clampedBase, end: clampedEnd, direction });
        }
      }
    }
    return chain;
  }, [vectors, accumulate, count, delta, startPoint, timeAxis, scaleA, scaleB]);
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
