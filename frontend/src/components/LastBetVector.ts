import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PairOption } from "../types/pair";

interface PairVectorsProps {
  selectedPair: PairOption | null;
  previousBetEnd: THREE.Vector3 | null;
}

const LastBetVector: React.FC<PairVectorsProps> = ({
                                                     selectedPair,
                                                     previousBetEnd,
                                                   }) => {
  const { scene } = useThree();
  const maxLength = 2; // Максимальная длина стрелки
  const bounds = {
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10,
    minZ: -10,
    maxZ: 10,
  };

  useEffect(() => {
    if (!selectedPair) {
      console.warn("No selected pair provided.");
      return;
    }

    if (!previousBetEnd) {
      console.warn("No previous bet end provided.");
      return;
    }

    console.log("Selected Pair: ", selectedPair);
    console.log("Previous Bet End: ", previousBetEnd);

    const arrow = drawArrow(
      new THREE.Vector3(0, 0, 0),
      previousBetEnd,
      0xffff00 // Желтый цвет стрелки
    );

    return () => {
      if (arrow) {
        scene.remove(arrow);
        console.log("Arrow removed from scene.");
      }
    };
  }, [selectedPair, previousBetEnd, scene]);

  const clampVector = (
    vector: THREE.Vector3,
    min: THREE.Vector3,
    max: THREE.Vector3
  ) => {
    return new THREE.Vector3(
      Math.max(min.x, Math.min(max.x, vector.x)),
      Math.max(min.y, Math.min(max.y, vector.y)),
      Math.max(min.z, Math.min(max.z, vector.z))
    );
  };

  const drawArrow = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number
  ): THREE.Group => {
    const chartMin = new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ);
    const chartMax = new THREE.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ);

    const clampedEnd = clampVector(end, chartMin, chartMax);
    const direction = new THREE.Vector3().subVectors(clampedEnd, start);
    let length = direction.length();

    if (length > maxLength) {
      direction.setLength(maxLength);
      length = maxLength;
      console.log(`Vector length limited to ${maxLength}`);
    }

    const normalizedDirection = direction.clone().normalize();

    const group = new THREE.Group();

    // Создаем линию (стержень стрелки)
    const lineGeometry = new THREE.CylinderGeometry(0.05, 0.05, length, 12);
    const lineMaterial = new THREE.MeshBasicMaterial({ color });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);

    // Устанавливаем позицию и ориентацию линии
    line.position.set(0, length / 2, 0);
    line.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normalizedDirection
    );

    // Создаем конус (наконечник стрелки)
    const coneGeometry = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMaterial = new THREE.MeshBasicMaterial({ color });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);

    // Устанавливаем позицию и ориентацию конуса
    cone.position.set(0, length + 0.15, 0);
    cone.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normalizedDirection
    );

    group.add(line);
    group.add(cone);
    group.position.copy(start);

    scene.add(group);
    console.log("Arrow added to scene:", group);

    return group;
  };

  return null;
};

export default LastBetVector;
