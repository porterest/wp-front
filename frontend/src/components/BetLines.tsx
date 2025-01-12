import React, { useEffect, useRef } from 'react';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;
  xValue: number;
  yValue: number;
  fixedPreviousBetEnd: THREE.Vector3;
  dashedLineStart: THREE.Vector3;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             xValue,
                                             yValue,
                                             dashedLineStart,
                                           }) => {
  const maxArrowLength = 2; // Максимальная длина жёлтой стрелки
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const yellowArrowRef = useRef<THREE.Mesh>(null); // Жёлтый конус
  const dashedArrowRef = useRef<THREE.Mesh>(null); // Белый конус
  const { scene } = useThree();

  // Инициализация линий
  useEffect(() => {
    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([0, 0, 0, previousBetEnd.x, previousBetEnd.y, previousBetEnd.z]);

    const yellowLineMaterial = new LineMaterial({
      color: 'yellow',
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const yellowLineInstance = new Line2(yellowLineGeometry, yellowLineMaterial);
    yellowLine.current = yellowLineInstance;
    scene.add(yellowLineInstance);

    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
      xValue, yValue, previousBetEnd.z,
    ]);

    const dashedLineMaterial = new LineMaterial({
      color: 'white',
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const dashedLineInstance = new Line2(dashedLineGeometry, dashedLineMaterial);
    dashedLine.current = dashedLineInstance;
    scene.add(dashedLineInstance);

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, xValue, yValue]);

  // Обновление линий и конусов
  useFrame(() => {
    // Ограничиваем длину жёлтой линии
    const direction = new THREE.Vector3()
      .subVectors(previousBetEnd, new THREE.Vector3(0, 0, 0))
      .normalize();

    let length = direction.length();
    if (length > maxArrowLength) {
      direction.setLength(maxArrowLength);
      length = maxArrowLength;
      console.log(`Длина жёлтой стрелки ограничена до ${maxArrowLength}`);
    }

    const clampedEnd = new THREE.Vector3().addVectors(
      new THREE.Vector3(0, 0, 0),
      direction.multiplyScalar(length)
    );

    // Обновляем позицию и ориентацию жёлтого конуса
    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.set(
        clampedEnd.x,
        clampedEnd.y,
        clampedEnd.z
      );

      yellowArrowRef.current.lookAt(0, 0, 0);
      yellowArrowRef.current.updateMatrix();
    }

    // Обновляем геометрию жёлтой линии
    const yellowLinePositions = [0, 0, 0, clampedEnd.x, clampedEnd.y, clampedEnd.z];
    if (yellowLine.current?.geometry) {
      yellowLine.current.geometry.setPositions(yellowLinePositions);
      yellowLine.current.geometry.attributes.position.needsUpdate = true;
    }

    // Обновляем позицию и ориентацию белого конуса
    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.set(xValue, yValue, dashedLineStart.z);

      const whiteDirection = new THREE.Vector3()
        .subVectors(
          new THREE.Vector3(xValue, yValue, dashedLineStart.z),
          dashedLineStart
        )
        .normalize();

      dashedArrowRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        whiteDirection
      );
      dashedArrowRef.current.updateMatrix();
    }

    // Обновляем геометрию пунктирной линии
    const dashedLinePositions = [
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
      xValue, yValue, previousBetEnd.z,
    ];
    if (dashedLine.current?.geometry) {
      dashedLine.current.geometry.setPositions(dashedLinePositions);
      dashedLine.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Жёлтый конус */}
      <mesh ref={yellowArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус */}
      <mesh ref={dashedArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </>
  );
};

export default BetLines;
