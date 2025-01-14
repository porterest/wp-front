import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

import { fetchUserBalances } from "../services/api";
// interface UserInfo { user_id: string; balance: number; atRisk: number; }

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // конец жёлтой линии
  userPreviousBet: THREE.Vector3;  // конец белой линии (старая ставка) либо то же что previousBetEnd если не было
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;         // макс длина
  handleDrag: (newPosition: THREE.Vector3) => void;
  // "X" | "Y" — какой «режим» управления осью
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
  // ===== REFS на объекты-сущности =====
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // ===== ФлагDragging =====
  const [isDragging, setIsDragging] = useState(false);

  // ===== Есть ли агрег. ставка? Если previousBetEnd=0,0,0 => нет
  const hasAggregated = previousBetEnd.length() > 0;

  // ===== Точка начала белой линии =====
  // если есть агрег -> start = previousBetEnd, иначе start=(0,0,0)
  const startPoint = hasAggregated ? previousBetEnd.clone() : new THREE.Vector3(0,0,0);

  // ===== Положение конца белой линии =====
  // Изначально userPreviousBet (или совпадает со startPoint, если не было)
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    () => userPreviousBet.clone()
  );

  // ===== Баланс юзера (по умолчанию 1$, чтоб не делить на 0) =====
  const [userBalance, setUserBalance] = useState(1);
  useEffect(() => {
    (async () => {
      try {
        const userInfo = await fetchUserBalances();
        const bal = (userInfo.balance < 1) ? 1 : userInfo.balance;
        setUserBalance(bal);
      } catch (err) {
        console.error("Error fetchUserBalances:", err);
      }
    })();
  }, []);

  // ===== При маунте если есть агрег, фиксируем x=3.5, иначе x=0 =====
  useEffect(() => {
    setBetPosition((prev) => {
      const clone = prev.clone();
      clone.x = hasAggregated ? 3.5 : 0;
      return clone;
    });
  }, [hasAggregated]);

  // === DEBOUNCED обновление белой линии ===
  const debouncedUpdateWhiteLine: DebouncedFunc<(p: unknown) => void> = debounce(
    (p: unknown) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const newPos = p as THREE.Vector3;
      const geom = whiteLineRef.current.geometry as LineGeometry;

      geom.setPositions([
        startPoint.x, startPoint.y, startPoint.z,
        newPos.x, newPos.y, newPos.z,
      ]);
    },
    20
  );

  // === Три.js сцена ===
  const { scene } = useThree();

  // === Инициализация линий (жёлтая, белая) и конусов ===
  useEffect(() => {
    // ---- Жёлтая линия: (0,0,0) -> previousBetEnd ----
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }

    // geometry + material + line2
    const yGeom = new LineGeometry();
    yGeom.setPositions([0,0,0, depositVec.x, depositVec.y, depositVec.z]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLineRef.current = new Line2(yGeom, yMat);
    scene.add(yellowLineRef.current);

    // Желтый конус
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVec);
      const dir = depositVec.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // ---- Белая линия: startPoint -> betPosition ----
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      startPoint.x, startPoint.y, startPoint.z,
      betPosition.x, betPosition.y, betPosition.z
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    whiteLineRef.current = new Line2(wGeom, wMat);
    scene.add(whiteLineRef.current);

    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(startPoint).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // Сфера (drag point)
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    // Очистка при размонтировании
    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    };
  }, [scene, previousBetEnd, betPosition, maxYellowLength, startPoint]);

  // ===== Храним предыдущую позицию мыши, чтобы вычислять дельты =====
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ===== pointerDown =====
  const handleMouseDown = (e: MouseEvent) => {
    // Проверяем, что ЛКМ
    if (e.button !== 0) return;

    // Можно проверить, что клик по сфере, но упростим: любой клик
    setIsDragging(true);
    onDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  // ===== pointerMove =====
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    // Обновим lastMouse
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    // scaleFactor для перевода пикселей в 3D
    const scaleFactor = 0.02;

    // Текущее положение
    const updatedPos = betPosition.clone();

    // Если есть агрег — x=3.5, иначе x=0
    updatedPos.x = hasAggregated ? 3.5 : 0;

    // Меняем одну координату:
    if (axisMode === "X") {
      // "X" => меняем z при движении мыши по dx (или dy, на ваше усмотрение).
      // Например, z -= dx*scaleFactor (dx>0 => двигаем z в минус, "вперед-назад")
      updatedPos.z -= dx * scaleFactor;
    } else if (axisMode === "Y") {
      // "Y" => меняем y при движении мыши по dy
      updatedPos.y -= dy * scaleFactor;
    }

    // Ограничим длину
    const finalDir = updatedPos.clone().sub(startPoint);
    if (finalDir.length() > maxYellowLength) {
      finalDir.setLength(maxYellowLength);
      updatedPos.copy(startPoint).add(finalDir);
    }

    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    // Обновим сферу + конус
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(startPoint).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // callback
    handleDrag(updatedPos);
  };

  // ===== pointerUp =====
  const handleMouseUp = (e: MouseEvent) => {
    if (e.button !== 0 || !isDragging) return;

    setIsDragging(false);
    onDragging(false);

    // Вычисляем ставку
    const finalDir = betPosition.clone().sub(startPoint);
    const fraction = finalDir.length() / maxYellowLength;
    // При length=0 => 1$, при length=max => userBalance
    const betAmount = 1 + fraction * (userBalance - 1);

    onShowConfirmButton(true, {
      amount: betAmount,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });
  };

  // Подключаем события на окно
  useEffect(() => {
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);

  useFrame(() => {
    // ничего
  });

  return (
    <>
      {/* Желтый конус */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (drag point) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
        {/* Вложенная невидимая сфера */}
        <mesh position={[0,0,0]}>
          <sphereGeometry args={[2,16,16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;
