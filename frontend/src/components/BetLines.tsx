import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";
import { fetchUserBalances } from "../services/api";

// интерфейс: interface UserInfo { user_id: string; balance: number; atRisk: number; }

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
  // axisMode: "X" | "Y", где "X" - движение по Z, "Y" - движение по Y
  axisMode: "X" | "Y";
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

  // Состояние «тянем ли мы сейчас»
  const [isDragging, setIsDragging] = useState(false);

  // Храним текущее положение белого вектора
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    userPreviousBet.clone()
  );

  // Загружаем баланс юзера из ручки
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    async function loadBalance() {
      try {
        const userInfo = await fetchUserBalances(); // { balance, user_id, ... }
        setUserBalance(userInfo.balance);
      } catch (err) {
        console.error("Failed to fetch user balance:", err);
      }
    }
    loadBalance();
  }, []);

  // Фиксированная ось x (чтобы «время» было посередине)
  const fixedTimeValue = 3.5;

  // При маунте жестко ставим x = 3.5
  useEffect(() => {
    setBetPosition((prev) => {
      const clone = prev.clone();
      clone.x = fixedTimeValue;
      return clone;
    });
  }, []);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  // Плоскость, параллельная оси YZ (x = 3.5)
  const plane = useRef(
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -fixedTimeValue)
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

  // Инициализация линий (желтой и белой)
  useEffect(() => {
    // === ЖЕЛТАЯ ЛИНИЯ (Deposit) ===
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

    // Желтый конус (на конце желтой линии)
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVector);
      const dir = depositVector.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // === БЕЛАЯ ЛИНИЯ (User Bet) ===
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

    // Очистка при размонтировании
    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, maxYellowLength, betPosition]);

  // Проверка, попал ли пользователь по сфере (drag point)
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
    // Ищем пересечение с плоскостью x=3.5
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
      return;
    }

    // Принудительно фиксируем x
    intersection.x = fixedTimeValue;

    // directionWhite: вектор от previousBetEnd до пересечения
    const directionWhite = intersection.clone().sub(previousBetEnd);

    // Ограничиваем максимум, если user тянет дальше, чем maxYellowLength
    if (directionWhite.length() > maxYellowLength) {
      directionWhite.setLength(maxYellowLength);
    }

    // Получаем конечную точку
    const newEndWhite = previousBetEnd.clone().add(directionWhite);

    // Обновляем координаты betPosition (двигаем только 1 ось)
    const updatedPos = betPosition.clone();
    updatedPos.x = fixedTimeValue;

    // Если axisMode="Y", то меняем y (растягиваем/сжимаем стрелку по y),
    // оставляя z прежним.
    if (axisMode === "Y") {
      updatedPos.y = newEndWhite.y;
    }
      // Если axisMode="X", то по «традиции» вашего кода двигаем z
    // (то есть "X" = перемещение по z).
    else if (axisMode === "X") {
      updatedPos.z = newEndWhite.z;
    }

    setBetPosition(updatedPos);

    // Обновляем линию (debounce)
    debouncedUpdateLine(updatedPos);

    // Двигаем сферу и конус
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }

    // Сообщаем родителю о новых координатах (если нужно)
    handleDrag(updatedPos);
  };

  // PointerUp
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Когда отпустили мышь, вычислим реальную ставку
      // (пропорция длины стрелки от maxYellowLength, умноженная на баланс)
      const finalDirection = betPosition.clone().sub(previousBetEnd);
      const fraction = finalDirection.length() / maxYellowLength;
      const betAmount = fraction * userBalance;

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [
          betPosition.x,
          betPosition.y,
          betPosition.z,
        ],
      });
    }
  };

  // Подвешиваем слушатели мыши
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
      {/* Желтый конус */}
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
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;
