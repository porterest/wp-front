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
  previousBetEnd: THREE.Vector3;   // Конец жёлтой линии (агр. ставка) либо (0,0,0), если её нет
  userPreviousBet: THREE.Vector3;  // Конец белой линии (ставка юзера), либо = previousBetEnd если не было
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  // axisMode: "X" | "Y" → какую координату двигаем
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
  // ==== REF на объекты ====
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // ==== Drag ====
  const [isDragging, setIsDragging] = useState(false);

  // Если нет агрег. ставки (previousBetEnd=0), начинаем белую линию с (0,0,0).
  // Иначе с previousBetEnd.
  const hasAggregatedStake = previousBetEnd.length() > 0;

  // Начальная позиция конца белой линии:
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(
    userPreviousBet.clone()
  );

  // ==== Подтягиваем баланс юзера ====
  const [userBalance, setUserBalance] = useState(1); // пусть по умолчанию 1$, чтобы не было деления на 0
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        // хотя бы 1$, чтобы при fraction=0 => 1$
        setUserBalance(balance < 1 ? 1 : balance);
      } catch (error) {
        console.error("Failed to fetch user balances:", error);
      }
    })();
  }, []);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  // Плоскость:
  // 1) если нет агрег. ставки => динамическая (зависящая от взгляда),
  // 2) если есть => x=3.5
  const plane = useRef<THREE.Plane>(
    hasAggregatedStake
      ? new THREE.Plane(new THREE.Vector3(1,0,0), -3.5) // x=3.5
      : new THREE.Plane(new THREE.Vector3(0,1,0), 0)   // временно; уточним, ниже обновим
  );

  // Debounced обновление белой линии
  // Debounced обновление белой линии
  const debouncedUpdateWhiteLine: DebouncedFunc<(v: unknown) => void> = debounce(
    (v: unknown) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;

      // Преобразуем входной аргумент к THREE.Vector3
      const posVector = v as THREE.Vector3;

      // Достаём geometry
      const geom = whiteLineRef.current.geometry as LineGeometry;

      // Ставим новые координаты (от previousBetEnd до posVector)
      geom.setPositions([
        previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
        posVector.x, posVector.y, posVector.z,
      ]);
    },
    30 // задержка в мс
  );


  // === ИНИЦИАЛИЗАЦИЯ ЛИНИЙ ===
  useEffect(() => {
    // 1) ЖЁЛТАЯ ЛИНИЯ: (0,0,0) → previousBetEnd (огранич. по maxYellowLength)
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
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

    // Желтый конус
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVec);
      const dirY = depositVec.clone().normalize();
      if (dirY.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatY = new THREE.Quaternion().setFromUnitVectors(up, dirY);
        yellowConeRef.current.setRotationFromQuaternion(quatY);
      }
    }

    // 2) БЕЛАЯ ЛИНИЯ: start → betPosition
    const startPoint = hasAggregatedStake ? previousBetEnd : new THREE.Vector3(0,0,0);
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
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    // Очистка
    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    };
  }, [scene, previousBetEnd, betPosition, maxYellowLength, hasAggregatedStake]);

  // === Проверка клика по сфере ===
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

  // === Если нет агрег. ставки, делаем плоскость динамической:
  const updatePlane = () => {
    if (!hasAggregatedStake) {
      // Плоскость перпендикулярна взгляду, проходит через betPosition
      const camDir = camera.getWorldDirection(new THREE.Vector3());
      plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
    } else {
      // Иначе оставляем x=3.5 (уже прописали в useRef)
    }
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

    const intersectPt = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
      return;
    }

    // Точка отсчёта
    const startPoint = hasAggregatedStake ? previousBetEnd : new THREE.Vector3(0,0,0);

    if (hasAggregatedStake) {
      // Плоскость x=3.5 => intersectPt.x ~ 3.5, фиксируем
      intersectPt.x = 3.5;
    }

    // direction = intersectPt - startPoint
    const direction = intersectPt.clone().sub(startPoint);

    // Обновим только одну координату в betPosition
    const updatedPos = betPosition.clone();

    if (hasAggregatedStake) {
      // x=3.5 всегда
      updatedPos.x = 3.5;
    } else {
      // не трогаем x, пользователь может двигать "куда" угодно, но всё равно axisMode ограничит
    }

    const partialPos = startPoint.clone().add(direction);

    // Меняем только нужную ось
    if (axisMode === "X") {
      updatedPos.x = partialPos.x; // если нет агр. ставки
      // или, если хотели "X" = двигаем Z → updatedPos.z = partialPos.z;
      // но вы пишете "X" => двигаем X.
      // y и z оставляем как было
    } else if (axisMode === "Y") {
      updatedPos.y = partialPos.y;
    }

    // Ограничим длину
    const finalDir = updatedPos.clone().sub(startPoint);
    if (finalDir.length() > maxYellowLength) {
      finalDir.setLength(maxYellowLength);
      updatedPos.copy(startPoint).add(finalDir);
    }

    // Сохраняем
    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    // Сдвигаем сферу + белый конус
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

    // handleDrag
    handleDrag(updatedPos);
  };

  // === pointerUp ===
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      const startPoint = hasAggregatedStake ? previousBetEnd : new THREE.Vector3(0,0,0);
      const finalDir = betPosition.clone().sub(startPoint);
      const fraction = finalDir.length() / maxYellowLength;

      // ставка: от 1$ при length=0, до userBalance при length=maxYellowLength
      const betAmount = 1 + fraction*(userBalance - 1);

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [ betPosition.x, betPosition.y, betPosition.z ],
      });
    }
  };

  // === Подключаем события ===
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

  useFrame(() => { /* ничего */ });

  return (
    <>
      {/* Желтый конус (конец агрегированной ставки) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (конец личной ставки) */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (drag point) */}
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
