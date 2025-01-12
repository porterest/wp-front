import React, { useRef, useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useUserBalance } from "../pages/BalancePage";
import BetLines from "./BetLines";

interface BetArrowProps {
  previousBetEnd: THREE.Vector3; // Агрегированная конечная точка предыдущей ставки
  userPreviousBet: THREE.Vector3; // Предыдущая ставка пользователя
  setUserPreviousBet: (value: THREE.Vector3) => void;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  axisMode: "X" | "Y";
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             axisMode,
                                           }) => {
  const endpointRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());
  const [xValue, setXValue] = useState(userPreviousBet.x); // Значения для позиции X
  const [yValue, setYValue] = useState(userPreviousBet.y); // Значения для позиции Y
  const [betAmount, setBetAmount] = useState(0); // Сумма ставки
  const { gl, camera } = useThree();

  const fixedPreviousBetEnd = previousBetEnd.clone(); // Конец жёлтой линии
  const dashedLineStart = fixedPreviousBetEnd.clone(); // Начало пунктирной линии

  const [isDragging, setIsDragging] = useState(false); // Флаг перетаскивания
  const { userData } = useUserBalance(); // Баланс пользователя
  const userDeposit = userData?.balance || 0; // Берём баланс из контекста
  const maxArrowLength = 5; // Максимальная длина стрелки

  const handlePointerUp = () => {
    if (isDragging) {
      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [xValue, yValue],
      });

      setIsDragging(false);
      onDragging(false);
      setUserPreviousBet(new THREE.Vector3(xValue, yValue, dashedLineStart.z));
    }
  };

  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!endpointRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(endpointRef.current);

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

    const direction = new THREE.Vector3().subVectors(
      intersection,
      fixedPreviousBetEnd
    );
    let distance = direction.length();

    if (distance > maxArrowLength) {
      distance = maxArrowLength;
      direction.setLength(maxArrowLength);
    }

    const newEnd = fixedPreviousBetEnd.clone().add(direction);

    if (axisMode === "X") {
      setXValue(newEnd.x);
    } else if (axisMode === "Y") {
      setYValue(newEnd.y);
    }

    const percentage = distance / maxArrowLength;
    const bet = percentage * userDeposit;

    setBetAmount(Math.min(bet, userDeposit));
  };

  const updateDynamicPlane = () => {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(cameraDirection, fixedPreviousBetEnd);
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
  }, [gl.domElement, isDragging, axisMode]);

  return (
    <>
      <BetLines
        previousBetEnd={previousBetEnd}
        xValue={xValue}
        yValue={yValue}
        // fixedPreviousBetEnd={fixedPreviousBetEnd}
        dashedLineStart={dashedLineStart}
      />
      <Text
        position={[
          fixedPreviousBetEnd.x,
          fixedPreviousBetEnd.y + 1,
          fixedPreviousBetEnd.z,
        ]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        Deposit: ${userDeposit.toFixed(2)}
      </Text>
      <Text
        position={[xValue + 0.5, yValue + 1, dashedLineStart.z + 0.5]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Bet: ${betAmount.toFixed(2)}
      </Text>
      <mesh ref={endpointRef} position={[xValue, yValue, dashedLineStart.z]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0} transparent />
      </mesh>
    </>
  );
};

export default BetArrow;
