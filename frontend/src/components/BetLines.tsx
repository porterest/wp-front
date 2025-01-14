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
  userPreviousBet: THREE.Vector3; // начальный вектор
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  // Расширяем axisMode до "X" | "Y" | "Z"
  axisMode: "X" | "Y" | "Z";
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
  const [betAmount, setBetAmount] = useState(0);
  const userDeposit = 1000;

  // Храним ОДИН Vector3 для белого вектора
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    // Клонируем начальный вектор (может быть (0,0,0) или нет)
    userPreviousBet.clone()
  );

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Куб для ограничений (при необходимости меняйте размеры)
  const boundingBox = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(7, 7, 7)
  );

  // Макс длина белой линии
  const maxWhiteLength = 7;

  // Функция-ограничитель длины вектора
  const restrictVector = (vector: THREE.Vector3, max: number): THREE.Vector3 => {
    if (vector.length() === 0) return vector;
    return vector.clone().setLength(Math.min(vector.length(), max));
  };

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

  // ======= ИНИЦИАЛИЗАЦИЯ ЛИНИЙ (ЖЁЛТАЯ + БЕЛАЯ) =======
  useEffect(() => {
    // Жёлтая линия, условно из (0,0,0) в previousBetEnd (либо, как в вашем коде).
    const depositVector = restrictVector(previousBetEnd, maxYellowLength);

    // Создаём геометрию жёлтой линии
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

    // Желтый конус на конце жёлтой линии
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVector);
      const dir = depositVector.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // Инициализация белой линии
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

    // Ставим белый конус и сферу (drag point) на начальное положение
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternionW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quaternionW);
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, maxYellowLength, betPosition]);

  // ======= ПОМЕТОК: При переключении оси мы НЕ сбрасываем betPosition =======
  // Достаточно того, что при "pointermove" мы будем менять только выбранную ось,
  // остальные координаты оставляем. Поэтому в useEffect на axisMode ничего не делаем:
  // betPosition уже хранит "где вектор стоит".


  // ======= ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =======
  const isIntersectingEndpoint = (event: PointerEvent): boolean => {
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

  // ======= Pointer Events =======
  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
      return;
    }

    // Считаем вектор direction и длину
    const directionWhite = intersection.clone().sub(previousBetEnd);
    let distanceWhite = directionWhite.length();
    distanceWhite = Math.min(distanceWhite, maxWhiteLength);

    // Это полный вектор от previousBetEnd (по длине не больше maxWhiteLength)
    const newEndWhite = previousBetEnd
      .clone()
      .add(directionWhite.setLength(distanceWhite));

    // Теперь берём текущий betPosition и меняем только одну координату
    const updatedPos = betPosition.clone();

    if (axisMode === "X") {
      updatedPos.x = newEndWhite.x; // изменяем X
    } else if (axisMode === "Y") {
      updatedPos.y = newEndWhite.y; // изменяем Y
    } else if (axisMode === "Z") {
      updatedPos.z = newEndWhite.z; // изменяем Z
    }

    // Ограничиваем в пределах куба (только положительные и < 7)
    boundingBox.clampPoint(updatedPos, updatedPos);

    // Запоминаем
    setBetPosition(updatedPos);

    // Ставка
    const percentage = distanceWhite / maxWhiteLength;
    const bet = percentage * userDeposit;
    setBetAmount(Math.min(bet, userDeposit));

    // Вызываем handleDrag
    handleDrag(updatedPos);

    // Обновляем белую линию (debounce)
    debouncedUpdateLine(updatedPos);

    // Перемещаем сферу
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }

    // Поворачиваем белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternionW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quaternionW);
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      onShowConfirmButton(true, {
        amount: betAmount,
        // Можем передать текущее положение
        predicted_vector: [
          betPosition.x,
          betPosition.y,
          betPosition.z
        ],
      });
    }
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
    // Здесь ничего не делаем, всё в handlePointerMove
  });

  return (
    <>
      {/* Жёлтый конус (не двигается) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (двигается со своей линией) */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (синий drag point) */}
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
