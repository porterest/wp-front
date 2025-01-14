import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

// Импорт ручки для получения баланса
import { fetchUserBalances } from "../api/userInfo";
// interface UserInfo { user_id: string; balance: number; atRisk: number; }

interface BetLinesProps {
  // === ЖЁЛТАЯ ЛИНИЯ ===
  // Агрегированная ставка от (0,0,0) до previousBetEnd (может быть (0,0,0), если ставок не было)
  previousBetEnd: THREE.Vector3;

  // === БЕЛАЯ ЛИНИЯ ===
  // От previousBetEnd до userPreviousBet (если у юзера была ставка, иначе userPreviousBet == previousBetEnd)
  userPreviousBet: THREE.Vector3;

  // Дёргаем, когда начинаем/заканчиваем drag
  onDragging: (isDragging: boolean) => void;

  // Показываем кнопку Bet, когда отпустили мышь
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;

  maxYellowLength: number;          // Макс длина агрегированной (жёлтой)
  handleDrag: (newPosition: THREE.Vector3) => void; // Колбэк для отслеживания
  axisMode: "X" | "Y";              // Режим оси (или "X", или "Y").
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
  // ==== REFS на объекты ====
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // === Состояние для Drag ===
  const [isDragging, setIsDragging] = useState(false);

  // === Положение конца белой линии (изначально userPreviousBet) ===
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    return userPreviousBet.clone();
  });

  // === Баланс юзера (берём из ручки fetchUserBalances) ===
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const userInfo = await fetchUserBalances();
        setUserBalance(userInfo.balance);
      } catch (err) {
        console.error("Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // === THREE STUFF ===
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  // Плоскость, чтобы ловить pointerMove
  const plane = useRef(new THREE.Plane());

  // === Debounced перерисовка белой линии ===
  const debouncedUpdateWhiteLine: DebouncedFunc<(pos: THREE.Vector3) => void> =
    debounce((pos: THREE.Vector3) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      // Белая линия: from previousBetEnd to pos
      geom.setPositions([
        previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
        pos.x, pos.y, pos.z,
      ]);
    }, 30);

  // === Инициализация (жёлтая + белая) при маунте И при обновлении betPosition ===
  useEffect(() => {
    // 1) ЖЁЛТАЯ ЛИНИЯ: (0,0,0) → previousBetEnd
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    // Создаём geometry + material
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 0,
      depositVec.x, depositVec.y, depositVec.z
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLineRef.current = new Line2(yGeom, yMat);
    scene.add(yellowLineRef.current);

    // Желтый конус на конце жёлтой линии
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVec);
      // Поворачиваем конус
      const dir = depositVec.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // 2) БЕЛАЯ ЛИНИЯ: previousBetEnd → betPosition
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
      betPosition.x, betPosition.y, betPosition.z
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    whiteLineRef.current = new Line2(wGeom, wMat);
    scene.add(whiteLineRef.current);

    // Белый конус на конце белой линии
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      // Поворот
      const dirW = betPosition.clone().sub(previousBetEnd).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // Сфера (drag point) на betPosition
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    // Очистка при размонтировании
    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    };
  }, [scene, previousBetEnd, betPosition, maxYellowLength]);

  // === Проверка: кликнули ли по сфере? ===
  const isClickOnSphere = (event: PointerEvent): boolean => {
    if (!sphereRef.current) return false;
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth)*2 - 1,
      -(event.clientY / gl.domElement.clientHeight)*2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    return hits.length > 0;
  };

  // === Плоскость: динамически ориентируем перпендикулярно взгляду и проходящую через betPosition ===
  const updatePlane = () => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  };

  // === pointerDown ===
  const handlePointerDown = (e: PointerEvent) => {
    if (isClickOnSphere(e)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
    }
  };

  // === pointerMove ===
  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth)*2 - 1,
      -(e.clientY / gl.domElement.clientHeight)*2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const pt = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, pt)) {
      return;
    }

    // direction = от previousBetEnd до пересечения
    const direction = pt.clone().sub(previousBetEnd);

    // === ограничиваем движение по оси (axisMode) ===
    if (axisMode === "X") {
      // "X" = двигаем X, оставляем Y,Z?
      // Или по вашей логике: "X" = двигаем Z?
      // Допустим, что "X" = двигаем X, тогда:
      direction.y = 0;
      direction.z = 0;
    }
    else if (axisMode === "Y") {
      // Меняем только Y
      direction.x = 0;
      direction.z = 0;
    }

    // Ограничиваем длину
    if (direction.length() > maxYellowLength) {
      direction.setLength(maxYellowLength);
    }

    // Новая конечная точка
    const newEnd = previousBetEnd.clone().add(direction);

    setBetPosition(newEnd);
    debouncedUpdateWhiteLine(newEnd);

    // Двигаем сферу, конус
    if (sphereRef.current) {
      sphereRef.current.position.copy(newEnd);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(newEnd);
      const dirW = newEnd.clone().sub(previousBetEnd).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // handleDrag
    handleDrag(newEnd);
  };

  // === pointerUp ===
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Длина белой линии = betPosition - previousBetEnd
      const finalDir = betPosition.clone().sub(previousBetEnd);
      const fraction = finalDir.length() / maxYellowLength;

      // Ставка = fraction * userBalance
      const betAmount = fraction * userBalance;

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  };

  // === Подписка на pointer события ===
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerMove]);

  useFrame(() => {
    // Ничего
  });

  return (
    <>
      {/* Жёлтый конус (конец агр. ставки) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (конец личной ставки) */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (drag point для белой линии) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
        {/* Вложенная невидимая сфера, чтобы проще было кликать */}
        <mesh position={[0,0,0]}>
          <sphereGeometry args={[2,16,16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;
