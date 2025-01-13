import React, { useRef, useEffect, useState } from "react";
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
  const [isDragging, setIsDragging] = useState(false);
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const restrictVector = (vector: THREE.Vector3, max: number) => {
    if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
      return vector;
    }
    const maxCoordinate = Math.max(
      Math.abs(vector.x),
      Math.abs(vector.y),
      Math.abs(vector.z)
    );
    const scale = max / maxCoordinate;
    return vector.clone().multiplyScalar(scale);
  };

  useEffect(() => {
    const yellowLineGeometry = new LineGeometry();
    const previousBetToRender = restrictVector(previousBetEnd, 2.5);
    yellowLineGeometry.setPositions([0, 0, 0, previousBetToRender.x, previousBetToRender.y, previousBetToRender.z]);
    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
    scene.add(yellowLine.current);

    const betToRender = restrictVector(userPreviousBet, 5);
    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([
      previousBetToRender.x,
      previousBetToRender.y,
      previousBetToRender.z,
      betToRender.x,
      betToRender.y,
      betToRender.z,
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

    const direction = new THREE.Vector3().subVectors(intersection, previousBetEnd);
    let distance = direction.length();
    if (distance > maxYellowLength) {
      distance = maxYellowLength;
      direction.setLength(maxYellowLength);
    }

    let newEnd = previousBetEnd.clone().add(direction);
    if (axisMode === "X") {
      newEnd.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEnd.x = previousBetEnd.x;
    }

    handleDrag(newEnd);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);
      onShowConfirmButton(true, {
        amount: 0,
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
  }, [gl.domElement, handlePointerMove]);

  useFrame(() => {
    const clampedYellowEnd = restrictVector(previousBetEnd, 2.5);
    const clampedDashedEnd = restrictVector(userPreviousBet, 5);

    if (yellowLine.current && yellowLine.current.geometry) {
      yellowLine.current.geometry.setPositions([0, 0, 0, clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z]);
    }

    if (dashedLine.current && dashedLine.current.geometry) {
      dashedLine.current.geometry.setPositions([
        clampedYellowEnd.x,
        clampedYellowEnd.y,
        clampedYellowEnd.z,
        clampedDashedEnd.x,
        clampedDashedEnd.y,
        clampedDashedEnd.z,
      ]);
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(clampedDashedEnd);
    }

    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.copy(clampedYellowEnd);
    }

    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.copy(clampedDashedEnd);
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

      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </>
  );
};

export default BetLines;
