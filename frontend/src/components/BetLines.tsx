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
  previousBetEnd: THREE.Vector3;    // конец жёлтой линии (агрег.)
  userPreviousBet: THREE.Vector3;   // конец белой линии (старая ставка)
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  // "X" => двигаем z, "Y" => двигаем y
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
  // === Refs на объекты для управления
  const yellowLineRef = useRef<Line2|null>(null);
  const whiteLineRef = useRef<Line2|null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // === Состояние dragging
  const [isDragging, setIsDragging] = useState(false);

  // === Есть ли агрегированная ставка
  const hasAggreg = previousBetEnd.length() > 0;

  // === Точка, откуда идёт белая линия
  const startPoint = hasAggreg
    ? previousBetEnd.clone()
    : new THREE.Vector3(0,0,0);

  // === Позиция конца белой линии
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    () => userPreviousBet.clone()
  );

  // === Подтягиваем баланс
  const [userBalance, setUserBalance] = useState(1);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchUserBalances();
        const bal = res.balance < 1 ? 1 : res.balance;
        setUserBalance(bal);
      } catch (err) {
        console.error("Failed to fetchUserBalances:", err);
      }
    })();
  }, []);

  // === При маунте (и если обновился hasAggreg), фиксируем x
  useEffect(() => {
    setBetPosition(prev => {
      const clone = prev.clone();
      clone.x = hasAggreg ? 3.5 : 0;   // ось времени
      return clone;
    });
  }, [hasAggreg]);

  // === Debounced обновление белой линии
  const debouncedUpdateWhiteLine: DebouncedFunc<(pos: unknown)=>void> = debounce(
    (pos: unknown) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const p = pos as THREE.Vector3;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        startPoint.x, startPoint.y, startPoint.z,
        p.x, p.y, p.z,
      ]);
    },
    30
  );

  // === Инициализация линий (жёлтой + белой)
  const { scene } = useThree();
  useEffect(() => {
    // --- Жёлтая линия ---
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
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
      const dirY = depositVec.clone().normalize();
      if (dirY.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatY = new THREE.Quaternion().setFromUnitVectors(up, dirY);
        yellowConeRef.current.setRotationFromQuaternion(quatY);
      }
    }

    // --- Белая линия ---
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

    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    };
  }, [scene, previousBetEnd, betPosition, maxYellowLength, startPoint]);

  // === Храним предыдущую позицию мыши
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // === pointerDown ===
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // ЛКМ
    // Можно проверить, что мышь реально попала по сфере, но упростим

    setIsDragging(true);
    onDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  // === pointerMove ===
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // scaleFactor для перевода пикселей в единицы
    const scaleFactor = 0.02;

    // Исходная позиция
    const updatedPos = betPosition.clone();

    // Фиксируем x
    updatedPos.x = hasAggreg ? 3.5 : 0;

    // Меняем одну координату:
    if (axisMode === "X") {
      // "X" => двигаем z (напр. по dx)
      updatedPos.z -= dx * scaleFactor;
    } else if (axisMode === "Y") {
      // "Y" => двигаем y (напр. по dy)
      updatedPos.y -= dy * scaleFactor;
    }

    // Ограничим длину
    const dir = updatedPos.clone().sub(startPoint);
    if (dir.length() > maxYellowLength) {
      dir.setLength(maxYellowLength);
      updatedPos.copy(startPoint).add(dir);
    }

    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    // Обновляем сферу + белый конус
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

  // === pointerUp ===
  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    if (e.button !== 0) return;

    setIsDragging(false);
    onDragging(false);

    // Считаем ставку
    const finalDir = betPosition.clone().sub(startPoint);
    const fraction = finalDir.length() / maxYellowLength;
    // min=1, max=userBalance
    const betAmount = 1 + fraction*(userBalance - 1);

    onShowConfirmButton(true, {
      amount: betAmount,
      predicted_vector: [
        betPosition.x, betPosition.y, betPosition.z
      ],
    });
  };

  // === Подписываемся на события
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

  useFrame(() => {/* ничего */});

  return (
    <>
      {/* Желтый конус */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (drag handle) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
        <mesh position={[0,0,0]}>
          <sphereGeometry args={[2,16,16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;
