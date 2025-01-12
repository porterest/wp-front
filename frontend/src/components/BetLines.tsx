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
  userPreviousBet: THREE.Vector3; // Новое свойство для белой стрелки
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             xValue,
                                             yValue,
                                             dashedLineStart,
                                             userPreviousBet,
                                           }) => {
  const maxYellowLength = 5; // Максимальная длина жёлтой линии
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const yellowArrowRef = useRef<THREE.Mesh>(null); // Жёлтый конус
  const dashedArrowRef = useRef<THREE.Mesh>(null); // Белый конус
  const { scene } = useThree();

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
      userPreviousBet.x, userPreviousBet.y, userPreviousBet.z,
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
  }, [scene, previousBetEnd, userPreviousBet]);

  useFrame(() => {
    // Ограничиваем длину жёлтой линии
    const direction = new THREE.Vector3().subVectors(previousBetEnd, new THREE.Vector3(0, 0, 0));
    const actualLength = direction.length();

    if (actualLength > maxYellowLength) {
      direction.setLength(maxYellowLength);
    }

    const clampedYellowEnd = new THREE.Vector3().addVectors(new THREE.Vector3(0, 0, 0), direction);

    // Обновляем позицию и ориентацию жёлтого конуса
    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.copy(clampedYellowEnd);
      yellowArrowRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), // Вектор по умолчанию (вверх)
        direction.clone().normalize() // Вектор направления
      );
    }

    // Обновляем геометрию жёлтой линии
    const yellowLinePositions = [0, 0, 0, clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z];
    if (yellowLine.current?.geometry) {
      yellowLine.current.geometry.setPositions(yellowLinePositions);
      yellowLine.current.geometry.attributes.position.needsUpdate = true;
    }

    // Белая линия начинается от конца жёлтой и идёт к `userPreviousBet`
    const dashedLineEnd = userPreviousBet;
    const dashedLinePositions = [
      clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z,
      dashedLineEnd.x, dashedLineEnd.y, dashedLineEnd.z,
    ];
    if (dashedLine.current?.geometry) {
      dashedLine.current.geometry.setPositions(dashedLinePositions);
      dashedLine.current.geometry.attributes.position.needsUpdate = true;
    }

    // Обновляем позицию и ориентацию белого конуса
    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.copy(dashedLineEnd);
      const dashedDirection = new THREE.Vector3()
        .subVectors(dashedLineEnd, clampedYellowEnd)
        .normalize();
      dashedArrowRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dashedDirection
      );
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
