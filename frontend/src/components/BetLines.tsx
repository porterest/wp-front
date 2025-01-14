import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // Конец желтой линии (Deposit)
  userPreviousBet: THREE.Vector3; // Начальная позиция для белой стрелки
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  // Чтобы стрелка двигалась только по Y или только по Z
  axisMode: "Y" | "Z";
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
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  const [isDragging, setIsDragging] = useState(false);

  // Фиксированная ось X = 3.5, чтобы «время» не двигалось
  const fixedTimeValue = 3.5;

  // Начальная позиция белой стрелки
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    userPreviousBet.clone()
  );

  // При маунте фиксируем x
  useEffect(() => {
    setBetPosition((prev) => {
      const clone = prev.clone();
      clone.x = fixedTimeValue;
      return clone;
    });
  }, []);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  // Плоскость, параллельная YZ (нормаль = (1,0,0)),
  // => x ВСЕГДА 3.5 при пересечении
  const plane = useRef(
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -fixedTimeValue)
  );

  // Debounced-обновление белой линии
  const debouncedUpdateLine: DebouncedFunc<(v: unknown) => void> = debounce(
    (v: unknown) => {
      const newEnd = v as THREE.Vector3;
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

  // Инициализация линий (желтая + белая)
  useEffect(() => {
    // === Желтая линия (Deposit) ===
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

    // Желтый конус
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVector);
      const dir = depositVector.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // === Белая линия (User Bet) ===
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

    // Белый конус и сфера (drag point)
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, maxYellowLength, betPosition]);

  // Проверка клика по сфере
  const isIntersectingEndpoint = (event: PointerEvent): boolean => {
    if (!sphereRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    return raycaster.current.intersectObject(sphereRef.current).length > 0;
  };

  // PointerDown
  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
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
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
      return;
    }

    // intersection.x ДОЛЖНО быть ~3.5 (т.к. плоскость x=3.5)
    // Чтобы не болталось, фиксируем x точно
    intersection.x = fixedTimeValue;

    // Ограничим длину вектора от previousBetEnd
    const directionWhite = intersection.clone().sub(previousBetEnd);
    if (directionWhite.length() > maxYellowLength) {
      directionWhite.setLength(maxYellowLength);
    }

    // Получили новую конечную точку
    const newEndWhite = previousBetEnd.clone().add(directionWhite);

    // Текущее положение (до перетаскивания)
    const updatedPos = betPosition.clone();

    // Ставим x фиксировано, т.к. "время" посередине
    updatedPos.x = fixedTimeValue;

    // Если у нас axisMode="Y", двигаемся только по Y, оставляем Z, чтобы не было «диагоналей»
    if (axisMode === "Y") {
      updatedPos.y = newEndWhite.y;
      // Z оставляем прежним
    }
    // Если axisMode="Z", двигаемся только по Z
    else if (axisMode === "Z") {
      updatedPos.z = newEndWhite.z;
      // Y оставляем прежним
    }

    // Обновим состояние
    setBetPosition(updatedPos);
    debouncedUpdateLine(updatedPos);

    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }

    // Поворот белого конуса
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }

    // Вызываем колбэк
    handleDrag(updatedPos);
  };

  // PointerUp
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Показать кнопку подтверждения
      onShowConfirmButton(true, {
        amount: 0, // Здесь можно проставить нужное значение
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  };

  // Регистрируем обработчики событий мыши
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
    // Пусто
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
