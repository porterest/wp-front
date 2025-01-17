import React, { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // конец жёлтой линии
  userPreviousBet: THREE.Vector3; // конец белой линии (старая ставка) или совпадает с previousBetEnd, если не было
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  setBetAmount: (newAmount: number) => void;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             maxWhiteLength,
                                             handleDrag,
                                             axisMode,
                                             setBetAmount,
                                           }) => {
  // Ссылки на объекты
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // Drag
  const [isDragging, setIsDragging] = useState(false);

  // Баланс юзера
  const [userBalance, setUserBalance] = useState(0);

  // Флаг, что данные готовы, и мы можем рисовать белую линию
  const [isReadyToDraw, setIsReadyToDraw] = useState(false);

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

  // aggregatorClipped: визуально ограниченный вектор депозита (для желтой линии)
  const aggregatorClipped = React.useMemo(() => {
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  // Позиция конца белой линии
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(null);

  // При первом рендере считаем, где будет белая линия
  useEffect(() => {
    // Если userPreviousBet равен (0,0,0), возможно, данных ещё нет
    // или просто никакой предыдущей ставки не было
    if (!userPreviousBet || userPreviousBet.length() === 0) {
      return;
    }

    // Инициализируем позицию
    const initPos = userPreviousBet.clone();
    const betDir = initPos.clone().sub(aggregatorClipped);

    if (betDir.length() > maxWhiteLength) {
      betDir.setLength(maxWhiteLength);
      initPos.copy(aggregatorClipped).add(betDir);
    }

    setBetPosition(initPos);
    // После установки корректной позиции говорим, что готовы рисовать
    setIsReadyToDraw(true);
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // THREE
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Debounced обновление белой линии
  const debouncedUpdateWhiteLine: DebouncedFunc<(pos: unknown) => void> =
    debounce((pos: unknown) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const p = pos as THREE.Vector3;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x,
        aggregatorClipped.y,
        aggregatorClipped.z,
        p.x,
        p.y,
        p.z,
      ]);
    }, 30);

  // Инициализация желтой линии и её объектов
  useEffect(() => {
    // Жёлтая линия: (0,0,0) → aggregatorClipped
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0,
      0,
      0,
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z,
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
      yellowConeRef.current.position.copy(aggregatorClipped);
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
    };
  }, [aggregatorClipped, scene]);

  // Рендер белой линии: aggregatorClipped → betPosition
  useEffect(() => {
    // Не рисуем, если не готовы
    if (!isReadyToDraw || !betPosition) return;

    // Если даже в это время betPosition нулевая, пропускаем
    if (betPosition.length() === 0) return;

    // Создаём белую линию
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z,
      betPosition.x,
      betPosition.y,
      betPosition.z,
    ]);

    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    whiteLineRef.current = new Line2(wGeom, wMat);
    scene.add(whiteLineRef.current);

    // Конусы и сфера (drag point)
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    return () => {
      if (whiteLineRef.current) {
        scene.remove(whiteLineRef.current);
      }
    };
  }, [isReadyToDraw, betPosition, aggregatorClipped, scene]);

  // Проверка клика по сфере
  const isClickOnSphere = (event: PointerEvent): boolean => {
    if (!sphereRef.current) return false;
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    return hits.length > 0;
  };

  // Обновляем плоскость (перпендикулярна взгляду, проходит через betPosition)
  const updatePlane = () => {
    if (!betPosition) return;
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

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !betPosition) return;

    const mouse = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1,
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersectPt = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
      return;
    }

    const direction = intersectPt.clone().sub(aggregatorClipped);
    const updatedPos = betPosition.clone();
    const partialPos = aggregatorClipped.clone().add(direction);

    if (axisMode === "X") {
      updatedPos.x = partialPos.x;
    } else if (axisMode === "Y") {
      updatedPos.y = partialPos.y;
    }

    const finalDir = updatedPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      updatedPos.copy(aggregatorClipped).add(finalDir);

      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);

      const calculatedLength = updatedPos.clone().sub(aggregatorClipped).length();
      if (calculatedLength > maxWhiteLength) {
        console.error("Error: updatedPos exceeds maxWhiteLength");
      }
    }

    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }

    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    handleDrag(updatedPos);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      if (!betPosition) return;
      const fraction = Math.min(
        1,
        betPosition.clone().sub(aggregatorClipped).length() / maxWhiteLength,
      );
      const betAmount = fraction * userBalance;
      setBetAmount(betAmount);

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
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
  }, [gl.domElement, handlePointerMove, betPosition]);

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
