import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Text } from "@react-three/drei";
import { useUserBalance } from "../pages/BalancePage";
import { fetchPreviousBetEnd } from "../services/api";

interface BetArrowProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  setUserPreviousBet: (value: THREE.Vector3) => void;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void;
  axisMode: "X" | "Y";
  pairId: string | undefined;
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             axisMode,
                                             pairId,
                                           }) => {
  const endpointRef = useRef<THREE.Mesh>(null);
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const yellowArrowRef = useRef<THREE.Mesh>(null);
  const dashedArrowRef = useRef<THREE.Mesh>(null);
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());
  const [xValue, setXValue] = useState(userPreviousBet.x);
  const [yValue, setYValue] = useState(userPreviousBet.y);
  const [betAmount, setBetAmount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { userData } = useUserBalance();
  const userDeposit = userData?.balance || 0;
  const maxArrowLength = 5;

  const handlePointerUp = () => {
    if (isDragging) {
      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [xValue, yValue],
      });
      setIsDragging(false);
      onDragging(false);
      setUserPreviousBet(new THREE.Vector3(xValue, yValue, previousBetEnd.z));
    }
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

    const direction = new THREE.Vector3().subVectors(
      intersection,
      previousBetEnd,
    );
    let distance = direction.length();

    if (distance > maxArrowLength) {
      distance = maxArrowLength;
      direction.setLength(maxArrowLength);
    }

    const newEnd = previousBetEnd.clone().add(direction);

    if (axisMode === "X") {
      setXValue(newEnd.x);
    } else if (axisMode === "Y") {
      setYValue(newEnd.y);
    }

    const percentage = distance / maxArrowLength;
    const bet = percentage * userDeposit;

    setBetAmount(Math.min(bet, userDeposit));
  };

  useEffect(() => {
    const canvas = gl.domElement; // Получаем canvas из контекста Three.js

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      // Удаляем обработчики событий при размонтировании
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl, isDragging]); // Добавляем зависимости для корректного обновления


  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!endpointRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
    );

    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(endpointRef.current!);

    return intersects.length > 0;
  };

  const updateDynamicPlane = () => {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(cameraDirection, previousBetEnd);
  };

  useEffect(() => {
    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([0, 0, 0, previousBetEnd.x, previousBetEnd.y, previousBetEnd.z]);

    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const yellowLineInstance = new Line2(yellowLineGeometry, yellowLineMaterial);
    yellowLine.current = yellowLineInstance;
    scene.add(yellowLineInstance);

    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([0, 0, 0, 0, 0, 0]);

    const dashedLineMaterial = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const dashedLineInstance = new Line2(dashedLineGeometry, dashedLineMaterial);
    dashedLine.current = dashedLineInstance;
    scene.add(dashedLineInstance);

    return () => {
      scene.remove(yellowLineInstance);
      scene.remove(dashedLineInstance);
    };
  }, [scene]);

  useEffect(() => {
    const updateLinePosition = async () => {
      if (!pairId) {
        console.warn("Pair ID is not provided. Skipping fetchPreviousBetEnd.");
        return;
      }

      try {
        const { x, y } = await fetchPreviousBetEnd(pairId);
        const newPosition = new THREE.Vector3(x, y, previousBetEnd.z);
        setUserPreviousBet(newPosition);

        if (yellowLine.current) {
          yellowLine.current.geometry.setPositions([
            0, 0, 0,
            newPosition.x, newPosition.y, newPosition.z,
          ]);
          yellowLine.current.geometry.computeBoundingBox();
          yellowLine.current.geometry.computeBoundingSphere();
        }

        if (dashedLine.current) {
          dashedLine.current.geometry.setPositions([
            previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
            newPosition.x, newPosition.y, previousBetEnd.z,
          ]);
          dashedLine.current.geometry.computeBoundingBox();
          dashedLine.current.geometry.computeBoundingSphere();
        }
      } catch (error) {
        console.error("Failed to fetch previous bet end:", error);
      }
    };

    updateLinePosition();
  }, [pairId, previousBetEnd]);

  useFrame(() => {
    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.set(
        previousBetEnd.x,
        previousBetEnd.y,
        previousBetEnd.z,
      );
    }

    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.set(xValue, yValue, previousBetEnd.z);
    }
  });

  return (
    <>
      <Text position={[previousBetEnd.x, previousBetEnd.y + 1, previousBetEnd.z]} fontSize={0.3} color="lightgreen">
        Deposit: ${userDeposit.toFixed(2)}
      </Text>
      <Text position={[xValue + 0.5, yValue + 1, previousBetEnd.z + 0.5]} fontSize={0.3} color="white">
        Bet: ${betAmount.toFixed(2)}
      </Text>
      <mesh ref={yellowArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
      <mesh ref={dashedArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh ref={endpointRef} position={[xValue, yValue, previousBetEnd.z]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetArrow;
//
//   return (
//     <>
//       {/* Текст депозита */}
//       <Text
//         position={[
//           fixedPreviousBetEnd.x,
//           fixedPreviousBetEnd.y + 1,
//           fixedPreviousBetEnd.z,
//         ]}
//         fontSize={0.3}
//         color="lightgreen"
//         anchorX="center"
//         anchorY="middle"
//       >
//         Deposit: ${userDeposit.toFixed(2)}
//       </Text>
//       {/* Текст ставки */}
//       <Text
//         position={[xValue + 0.5, yValue + 1, dashedLineStart.z + 0.5]}
//         fontSize={0.3}
//         color="white"
//         anchorX="center"
//         anchorY="middle"
//       >
//         Bet: ${betAmount.toFixed(2)}
//       </Text>
//       {/* Жёлтый конус (стрелка) */}
//       <mesh ref={yellowArrowRef}>
//         <coneGeometry args={[0.1, 0.3, 12]} />
//         <meshStandardMaterial color="yellow" />
//       </mesh>
//       {/* Белый конус (стрелка) */}
//       <mesh ref={dashedArrowRef}>
//         <coneGeometry args={[0.1, 0.3, 12]} />
//         <meshStandardMaterial color="white" />
//       </mesh>
//       {/* Сфера на конце стрелки */}
//       <mesh ref={endpointRef} position={[xValue, yValue, dashedLineStart.z]}>
//         <sphereGeometry args={[1, 16, 16]} />
//         <meshStandardMaterial color="blue" opacity={0} transparent />
//       </mesh>
//     </>
//   );
// };
//
// export default BetArrow;
