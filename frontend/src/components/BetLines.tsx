import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // "жёлтая" линия (Deposit)
  userPreviousBet: THREE.Vector3; // начальный вектор белой линии
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  // Совпадает с тем, что в BetArrow: "X" | "Y"
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
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  const [isDragging, setIsDragging] = useState(false);

  // Храним текущую позицию белой стрелки
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    userPreviousBet.clone()
  );

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ограничивающий бокс (при необходимости поменяйте)
  const boundingBox = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(7, 7, 7)
  );

  // Debounced-обновление белой линии
  const debouncedUpdateLine: DebouncedFunc<(v: unknown) => void> = debounce(
    (newEndVector: unknown) => {
      const newEnd = newEndVector as THREE.Vector3;
      if (dashedLine.current && dashedLine.current.geometry) {
        (dashedLine.current.geometry as LineGeometry).setPositions([
          previousBetEnd.x,
          previousBetEnd.y,
          previousBetEnd.z,
          newEnd.x,
          newEnd.y,
          newEnd.z,
        ]);
      }
    },
    50
  );

  // ИНИЦИАЛИЗАЦИЯ ЛИНИЙ
  useEffect(() => {
    // === Жёлтая линия (Deposit) ===
    // Ограничим длину жёлтой линии
    const depositVector = previousBetEnd.clone();
    if (depositVector.length() > maxYellowLength) {
      depositVector.setLength(maxYellowLength);
    }

    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([
      0, 0, 0,
      depositVector.x,
      depositVector.y,
      depositVector.z,
    ]);
    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
    scene.add(yellowLine.current);

    // Желтый конус на конце
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVector);
      const dir = depositVector.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // === Белая линия (ставка пользователя) ===
    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([
      previousBetEnd.x,
      previousBetEnd.y,
      previousBetEnd.z,
      betPosition.x,
      betPosition.y,
      betPosition.z,
    ]);
    const dashedLineMaterial = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    dashedLine.current = new Line2(dashedLineGeometry, dashedLineMaterial);
    scene.add(dashedLine.current);

    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }

    // Сфера (drag point)
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    // Очистка при размонтировании
    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, maxYellowLength, betPosition]);

  // Проверяем, кликнул ли пользователь по сфере (drag point)
  const isIntersectingEndpoint = (event: PointerEvent): boolean => {
    if (!sphereRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    return raycaster.current.intersectObject(sphereRef.current).length > 0;
  };

  // Динамическая плоскость перетаскивания
  const updateDynamicPlane = () => {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(cameraDirection, previousBetEnd);
  };

  // PointerDown
  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  // PointerMove
  const handlePointerMove = (event: PointerEvent): void => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    // Если пересечения с плоскостью нет, то ничего не делаем
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
      return;
    }

    // Берём вектор из previousBetEnd до точки пересечения
    const direction = intersection.clone().sub(previousBetEnd);

    // Ограничиваем длину
    if (direction.length() > maxYellowLength) {
      direction.setLength(maxYellowLength);
    }

    // Строим новую конечную точку
    const newEnd = previousBetEnd.clone().add(direction);

    // Исходная позиция до перетаскивания
    const updatedPos = betPosition.clone();

    // Если ось "X", то меняем только X, Y оставляем
    if (axisMode === "X") {
      updatedPos.x = newEnd.x;
    }
    // Если ось "Y", то меняем только Y, X оставляем
    else if (axisMode === "Y") {
      updatedPos.y = newEnd.y;
    }

    // Можем ограничивать в пределах бокса (по желанию)
    boundingBox.clampPoint(updatedPos, updatedPos);

    // Сохраняем
    setBetPosition(updatedPos);

    // Дебаунс-обновление белой линии
    debouncedUpdateLine(updatedPos);

    // Двигаем сферу
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }

    // Поворачиваем белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }

    // Сообщаем родителю (BetArrow)
    handleDrag(updatedPos);
  };

  // PointerUp
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Сообщаем родителю, что можно показать кнопку подтверждения
      onShowConfirmButton(true, {
        amount: 0, // Можем здесь поставить 0 или какую-то сумму
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  };

  // Регистрируем события мыши
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
    // Ничего не делаем в каждом кадре
  });

  return (
    <>
      {/* Желтый конус (Deposit) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (Bet) */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (drag point) */}
      <mesh ref={sphereRef} scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2.0, 16, 16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;
