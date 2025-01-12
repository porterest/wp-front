import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { useUserBalance } from "../pages/BalancePage"; // Для получения баланса

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void;
  maxYellowLength: number;
  axisMode: "X" | "Y";
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
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
  const [xValue, setXValue] = useState(userPreviousBet.x);
  const [yValue, setYValue] = useState(userPreviousBet.y);
  const [betAmount, setBetAmount] = useState(0);

  const { userData } = useUserBalance();
  const userBalance = userData?.balance || 0;

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
        amount: betAmount,
        predicted_vector: [xValue, yValue],
      });
      setIsDragging(false);
      onDragging(false);
    }
  };

  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!sphereRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
    );

    raycaster.current.setFromCamera(mouse, camera);
    return raycaster.current.intersectObject(sphereRef.current).length > 0;
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
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
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
      newEnd.y = previousBetEnd.y; // Фиксируем Y
    } else if (axisMode === "Y") {
      newEnd.x = previousBetEnd.x; // Фиксируем X
    }

    setXValue(newEnd.x);
    setYValue(newEnd.y);

    const percentage = distance / maxYellowLength;
    const bet = percentage * userBalance;
    setBetAmount(Math.min(bet, userBalance));
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
    const clampedYellowEnd = previousBetEnd.clone().add(
      new THREE.Vector3(xValue - previousBetEnd.x, yValue - previousBetEnd.y, 0).clampLength(0, maxYellowLength),
    );

    yellowLine.current?.geometry.setPositions([0, 0, 0, clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z]);
    yellowLine.current?.geometry.attributes.position.needsUpdate = true;

    dashedLine.current?.geometry.setPositions([
      clampedYellowEnd.x,
      clampedYellowEnd.y,
      clampedYellowEnd.z,
      userPreviousBet.x,
      userPreviousBet.y,
      userPreviousBet.z,
    ]);
    dashedLine.current?.geometry.attributes.position.needsUpdate = true;

    sphereRef.current?.position.copy(clampedYellowEnd);

    yellowArrowRef.current?.position.copy(clampedYellowEnd);
    yellowArrowRef.current?.lookAt(previousBetEnd);

    dashedArrowRef.current?.position.copy(userPreviousBet);
    dashedArrowRef.current?.lookAt(clampedYellowEnd);
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
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </>
  );
};

export default BetLines;
