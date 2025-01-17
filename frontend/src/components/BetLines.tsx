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

  // aggregatorClipped: визуально ограниченный вектор депозита (для желтой линии).
  const aggregatorClipped = React.useMemo(() => {
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  console.log("aggregatorClipped - Это начало белой линии, конец жёлтой линии");
  console.log(aggregatorClipped);
  // Позиция конца белой линии
  const [betPosition, setBetPosition] = useState(() => userPreviousBet.clone());
  // const isUserBetReady = userPreviousBet.x !== 0 || userPreviousBet.y !== 0;

  // Рассчитываем начальное значение `betPosition`
  useEffect(() => {

    console.log("Рассчитываем начальную позицию betPosition");
    console.log(userPreviousBet);

    const initPos = userPreviousBet.clone();
    const betDir = initPos.clone().sub(aggregatorClipped);

    if (betDir.length() > maxWhiteLength) {
      betDir.setLength(maxWhiteLength);
      initPos.copy(aggregatorClipped).add(betDir);
    }

    setBetPosition(initPos);
    console.log("2 установили позицию белой линии можно рисовать");
    console.log(initPos);
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
      console.log("geom - Debounced обновление белой линии");
      console.log(geom);
      geom.setPositions([
        aggregatorClipped.x,
        aggregatorClipped.y,
        aggregatorClipped.z,
        p.x,
        p.y,
        p.z,
      ]);
      console.log(geom);
    }, 30);

  // Инициализация линий, конусов и сферы
  useEffect(() => {
    // === ЖЁЛТАЯ ЛИНИЯ: (0,0,0) → aggregatorClipped
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

    // Желтый конус (на aggregatorClipped, но надпись Deposit - на previousBetEnd)
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
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
  }, [aggregatorClipped, betPosition, scene]);

  // === БЕЛАЯ ЛИНИЯ: aggregatorClipped → betPosition
  useEffect(() => {
    // Проверяем, что все данные готовы
    // if ( !betPosition || !aggregatorClipped) return;

    console.log("3 - Создание белой линии с корректным началом и концом");
    console.log(betPosition, aggregatorClipped);

    if (betPosition.x === 0 && betPosition.y === 0) {
      return;
    }
    else {
      // === Создаём белую линию: aggregatorClipped → betPosition
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

    }
    return () => {
      if (whiteLineRef.current) {
        console.log("Удаление белой линии");
        scene.remove(whiteLineRef.current);
      }
    };
  }, [ betPosition, aggregatorClipped, scene]);

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
    if (!isDragging) return;

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
    console.log("Before finalDir limit:", finalDir);
    console.log("Before finalDir limit, length:", finalDir.length());

    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      console.log("After finalDir limit:", finalDir);
      console.log("After finalDir limit, length:", finalDir.length());

      updatedPos.copy(aggregatorClipped).add(finalDir); // Применяем ограничение
      console.log("UpdatedPos after applying limited finalDir:", updatedPos);


      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);

      // Проверка длины updatedPos
      const calculatedLength = updatedPos
        .clone()
        .sub(aggregatorClipped)
        .length();
      console.log("Calculated Length of updatedPos:", calculatedLength);

      const normalizedFinalDir = finalDir
        .clone()
        .normalize()
        .multiplyScalar(maxWhiteLength);
      console.log("normalizedFinalDir:", normalizedFinalDir);
      updatedPos.copy(aggregatorClipped).add(normalizedFinalDir);
      console.log("UpdatedPos after applying limited:", updatedPos);

      if (calculatedLength > maxWhiteLength) {
        console.error("Error: updatedPos exceeds maxWhiteLength");
      }
    }

    // Обновляем состояние
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
    // Если мы завершили перетаскивание
    if (isDragging) {
      // Обновляем состояние перетаскивания
      setIsDragging(false);
      onDragging(false);

      // Логируем важные параметры для дебага
      console.log("previousBet", previousBetEnd); // Позиция предыдущей ставки
      console.log("betPos", betPosition); // Текущая позиция ставки
      console.log("betPos.length", betPosition.length()); // Длина вектора от начала координат
      console.log("max white", maxWhiteLength); // Максимальная длина белой линии

      // Рассчитываем долю ставки относительно максимальной длины
      // const fraction = Math.min(1, betPosition.length() / maxWhiteLength); // Ограничиваем долю в пределах [0, 1]
      const fraction = Math.min(1, betPosition.clone().sub(aggregatorClipped).length() / maxWhiteLength);

      console.log("betPosition.length()", "maxWhiteLength");
      console.log(betPosition.length(), maxWhiteLength);
      console.log(betPosition.length() / maxWhiteLength);
      // Рассчитываем сумму ставки как долю от общего баланса
      const betAmount = fraction * userBalance;

      // Логируем значения для проверки
      console.log("fraction - Доля относительно maxWhiteLength:", fraction); // Доля относительно maxWhiteLength
      console.log("betAmount: - Итоговая сумма ставки", betAmount); // Итоговая сумма ставки

      // Обновляем состояние суммы ставки
      setBetAmount(betAmount);

      // Показываем кнопку подтверждения с данными ставки
      onShowConfirmButton(true, {
        amount: betAmount, // Сумма ставки
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z], // Предсказанный вектор
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

