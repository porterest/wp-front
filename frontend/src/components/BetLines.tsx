import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  axisMode: "X" | "Y";
  handleDrag: (newPosition: THREE.Vector3) => void;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             axisMode,
                                             handleDrag,
                                           }) => {
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowArrowRef = useRef<THREE.Mesh>(null);
  const dashedArrowRef = useRef<THREE.Mesh>(null);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());
  let isDragging = false;

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

  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      isDragging = true;
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

    const direction = new THREE.Vector3().subVectors(intersection, previousBetEnd);
    let distance = direction.length();
    if (distance > maxYellowLength) {
      distance = maxYellowLength;
      direction.setLength(maxYellowLength);
    }

    const newEnd = previousBetEnd.clone().add(direction);
    if (axisMode === "X") {
      newEnd.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEnd.x = previousBetEnd.x;
    }

    handleDrag(newEnd);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      isDragging = false;
      onDragging(false);
      onShowConfirmButton(true, {
        amount: 0, // Здесь можно настроить расчет суммы
        predicted_vector: [userPreviousBet.x, userPreviousBet.y],
      });
    }
  };

  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!sphereRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, camera);
    return raycaster.current.intersectObject(sphereRef.current).length > 0;
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
  }, [gl.domElement]);

  useFrame(() => {
    const clampedYellowEnd = previousBetEnd.clone().add(
      new THREE.Vector3(
        userPreviousBet.x - previousBetEnd.x,
        userPreviousBet.y - previousBetEnd.y,
        0
      ).clampLength(0, maxYellowLength)
    );

    if (yellowLine.current && yellowLine.current.geometry) {
      yellowLine.current.geometry.setPositions([0, 0, 0, clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z]);
    }

    if (dashedLine.current && dashedLine.current.geometry) {
      dashedLine.current.geometry.setPositions([
        clampedYellowEnd.x,
        clampedYellowEnd.y,
        clampedYellowEnd.z,
        userPreviousBet.x,
        userPreviousBet.y,
        userPreviousBet.z,
      ]);
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(clampedYellowEnd);
    }

    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.copy(clampedYellowEnd);
      yellowArrowRef.current.lookAt(previousBetEnd);
    }

    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.copy(userPreviousBet);
      dashedArrowRef.current.lookAt(clampedYellowEnd);
    }
  });

  return (
    <>
      {/* Желтая стрелка */}
      <mesh ref={yellowArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белая стрелка */}
      <mesh ref={dashedArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </>
  );
};

export default BetLines;
