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
  dashedLineStart: THREE.Vector3;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             xValue,
                                             yValue,
                                             dashedLineStart,
                                           }) => {
  const maxYellowLength = 3; // Максимальная длина жёлтой стрелки
  const maxDashedLength = 4; // Максимальная длина белой пунктирной стрелки
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
    const yellowDirection = new THREE.Vector3()
      .subVectors(previousBetEnd, new THREE.Vector3(0, 0, 0))
      .normalize();

    let yellowLength = yellowDirection.length();
    if (yellowLength > maxYellowLength) {
      yellowDirection.setLength(maxYellowLength);
      yellowLength = maxYellowLength;
    }

    const clampedYellowEnd = new THREE.Vector3().addVectors(
      new THREE.Vector3(0, 0, 0),
      yellowDirection.multiplyScalar(yellowLength)
    );

    // Обновляем позицию и ориентацию жёлтого конуса
    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.copy(clampedYellowEnd);
      yellowArrowRef.current.lookAt(0, 0, 0);
      yellowArrowRef.current.updateMatrix();
    }

    // Обновляем геометрию жёлтой линии
    const yellowLinePositions = [0, 0, 0, clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z];
    if (yellowLine.current?.geometry) {
      yellowLine.current.geometry.setPositions(yellowLinePositions);
      yellowLine.current.geometry.attributes.position.needsUpdate = true;
    }

    // Ограничиваем длину белой линии
    const whiteDirection = new THREE.Vector3()
      .subVectors(new THREE.Vector3(xValue, yValue, dashedLineStart.z), clampedYellowEnd)
      .normalize();

    let whiteLength = whiteDirection.length();
    if (whiteLength > maxDashedLength) {
      whiteDirection.setLength(maxDashedLength);
      whiteLength = maxDashedLength;
    }

    const clampedWhiteEnd = new THREE.Vector3().addVectors(
      clampedYellowEnd,
      whiteDirection.multiplyScalar(whiteLength)
    );

    // Обновляем позицию и ориентацию белого конуса
    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.copy(clampedWhiteEnd);
      dashedArrowRef.current.lookAt(clampedYellowEnd);
      dashedArrowRef.current.updateMatrix();
    }

    // Обновляем геометрию белой пунктирной линии
    const dashedLinePositions = [
      clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z,
      clampedWhiteEnd.x, clampedWhiteEnd.y, clampedWhiteEnd.z,
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
