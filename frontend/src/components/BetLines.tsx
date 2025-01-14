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
  userPreviousBet: THREE.Vector3;  // конец белой линии (старая ставка) или совпадает с previousBetEnd, если не было
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  // При axisMode="X" двигаем X, при "Y" двигаем Y, а остальные координаты не трогаем.
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
  // Ссылки на объекты
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // Drag
  const [isDragging, setIsDragging] = useState(false);

  // Позиция конца белой линии (изначально userPreviousBet).
  // ВАЖНО: при смене axisMode НЕ сбрасываем, чтобы сохранять состояние.
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

  // Баланс юзера
  const [userBalance, setUserBalance] = useState(0);

  // Подтянем баланс один раз
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (error) {
        console.error("Failed to fetch user balances:", error);
      }
    })();
  }, []);

  // THREE
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -fixedTimeValue)
  );
  // Debounced обновление белой линии
  const debouncedUpdateWhiteLine: DebouncedFunc<(pos: THREE.Vector3) => void> =
    debounce((pos: unknown) => {
      const newEndVector = (pos) as THREE.Vector3;
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
        newEndVector.x, newEndVector.y, newEndVector.z,
      ]);
    }, 30);


  // Инициализация линий, конусов, сферы
  useEffect(() => {
    // === ЖЁЛТАЯ ЛИНИЯ: (0,0,0) → previousBetEnd (с обрезкой по maxYellowLength)
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
      const dir = depositVec.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // === БЕЛАЯ ЛИНИЯ: previousBetEnd → betPosition
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
      betPosition.x,   betPosition.y,   betPosition.z
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
      const dirW = betPosition.clone().sub(previousBetEnd).normalize();
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

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    };
  }, [scene, previousBetEnd, betPosition, maxYellowLength]);

  // Проверка клика по сфере
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

  // Обновляем плоскость (перпендикулярна взгляду, проходит через betPosition)
  const updatePlane = () => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  };

  // pointerDown
  const handlePointerDown = (e: PointerEvent) => {
    if (isClickOnSphere(e)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
    }
  };

  // pointerMove
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
    intersectPt.x = fixedTimeValue;

    // direction = intersectPt - previousBetEnd
    const direction = intersectPt.clone().sub(previousBetEnd);

    // СОХРАНЯЕМ другие координаты, МЕНЯЕМ только нужную!
    const updatedPos = betPosition.clone(); // Текущее положение
    updatedPos.x = fixedTimeValue
    // Ограничим длину?
    // сначала примем direction, затем скорректируем одну ось
    // и в конце отрежем, если длиннее maxYellowLength
    const partialPos = previousBetEnd.clone().add(direction);

    // Перенесём partialPos в updatedPos, но только для одной координаты
    if (axisMode === "X") {
      updatedPos.x = partialPos.x; // менять X
      // y и z оставляем как было
    } else if (axisMode === "Y") {
      updatedPos.y = partialPos.y; // менять Y
      // x и z оставляем как было
    }

    // Теперь ограничим итоговую длину
    const finalDir = updatedPos.clone().sub(previousBetEnd);
    if (finalDir.length() > maxYellowLength) {
      finalDir.setLength(maxYellowLength);
      updatedPos.copy(previousBetEnd).add(finalDir);
    }

    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    // Сдвигаем сферу + конус
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // handleDrag
    handleDrag(updatedPos);
  };

  // pointerUp
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Длина белой линии
      const finalDir = betPosition.clone().sub(previousBetEnd);
      const fraction = finalDir.length() / maxYellowLength;
      const betAmount = fraction * userBalance;

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [
          betPosition.x, betPosition.y, betPosition.z
        ],
      });
    }
  };

  // Слушатели
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
    // пусто
  });

  return (
    <>
      {/* Желтый конус (конец агрегированной ставки) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (конец личной ставки) */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
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
