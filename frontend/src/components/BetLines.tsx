import React, { useRef, useEffect, useState } from "react";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // Конец желтой линии
  userPreviousBet: THREE.Vector3; // Ставка пользователя
  onDragging: (isDragging: boolean) => void; // Колбек для управления состоянием перетаскивания
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void; // Колбек для отображения кнопки подтверждения
  maxYellowLength: number; // Максимальная длина желтой стрелки
  handleDrag: (newPosition: THREE.Vector3) => void; // Колбек для обновления позиции
  axisMode: "X" | "Y"; // Осевой режим
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             handleDrag,
                                             axisMode,
                                           }) => {
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowArrowRef = useRef<THREE.Mesh>(null);
  const dashedArrowRef = useRef<THREE.Mesh>(null);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Создаем линии
    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([0, 0, 0, previousBetEnd.x, previousBetEnd.y, previousBetEnd.z]);
    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
    scene.add(yellowLine.current);

    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([
      previousBetEnd.x,
      previousBetEnd.y,
      previousBetEnd.z,
      userPreviousBet.x,
      userPreviousBet.y,
      userPreviousBet.z,
    ]);
    const dashedLineMaterial = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    dashedLine.current = new Line2(dashedLineGeometry, dashedLineMaterial);
    scene.add(dashedLine.current);

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, userPreviousBet]);

  const handlePointerUp = () => {
    if (isDragging) {
      onShowConfirmButton(true, {
        amount: 0, // Значение будет рассчитано позже
        predicted_vector: [userPreviousBet.x, userPreviousBet.y],
      });

      setIsDragging(false);
      onDragging(false);
    }
  };

  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!sphereRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(sphereRef.current);

    return intersects.length > 0;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );

    const intersection = new THREE.Vector3();
    raycaster.current.setFromCamera(mouse, camera);
    raycaster.current.ray.intersectPlane(plane.current, intersection);

    let newEnd = intersection.clone();

    if (axisMode === "X") {
      newEnd.set(newEnd.x, previousBetEnd.y, previousBetEnd.z);
    } else if (axisMode === "Y") {
      newEnd.set(previousBetEnd.x, newEnd.y, previousBetEnd.z);
    }

    const direction = new THREE.Vector3().subVectors(newEnd, previousBetEnd);
    if (direction.length() > maxYellowLength) {
      direction.setLength(maxYellowLength);
    }
    newEnd = previousBetEnd.clone().add(direction);

    handleDrag(newEnd);
  };

  const updateDynamicPlane = () => {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(cameraDirection, previousBetEnd);
  };

  useEffect(() => {
    const canvas = gl.domElement;

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, isDragging]);

  useFrame(() => {
    const direction = new THREE.Vector3().subVectors(previousBetEnd, new THREE.Vector3(0, 0, 0));
    if (direction.length() > maxYellowLength) {
      direction.setLength(maxYellowLength);
    }
    const clampedYellowEnd = new THREE.Vector3().addVectors(new THREE.Vector3(0, 0, 0), direction);

    // Обновляем желтую линию
    const yellowLinePositions = [0, 0, 0, clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z];
    if (yellowLine.current?.geometry) {
      yellowLine.current.geometry.setPositions(yellowLinePositions);
      yellowLine.current.geometry.attributes.position.needsUpdate = true;
    }

    // Обновляем белую линию
    const dashedLinePositions = [
      clampedYellowEnd.x,
      clampedYellowEnd.y,
      clampedYellowEnd.z,
      userPreviousBet.x,
      userPreviousBet.y,
      userPreviousBet.z,
    ];
    if (dashedLine.current?.geometry) {
      dashedLine.current.geometry.setPositions(dashedLinePositions);
      dashedLine.current.geometry.attributes.position.needsUpdate = true;
    }

    // Конусы
    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.copy(clampedYellowEnd);
      yellowArrowRef.current.lookAt(0, 0, 0);
    }
    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.copy(userPreviousBet);
      dashedArrowRef.current.lookAt(clampedYellowEnd);
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(userPreviousBet.length() > 0 ? userPreviousBet : clampedYellowEnd);
    }
  });

  return (
    <>
      <mesh ref={yellowArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      <mesh ref={dashedArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh ref={sphereRef} position={[userPreviousBet.x, userPreviousBet.y, previousBetEnd.z]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
