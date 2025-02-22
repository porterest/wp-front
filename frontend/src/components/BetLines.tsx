import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fetchUserBalances } from "../services/api";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { useScale } from "../context/ScaleContext";
import WhileLine from "./WhiteLine";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "Y" | "Z";
  visible: boolean;
  updateBetPosition: (position: THREE.Vector3) => void;
}

const LOCAL_KEY = "userBetVector";

// Проверка, является ли вектор нулевым (с эпсилоном)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;


const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             maxWhiteLength,
                                             handleDrag,
                                             axisMode,
                                             visible,
                                             updateBetPosition,
                                           }) => {
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useRef(new THREE.Raycaster());

  // Рефы для жёлтого вектора
  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);

  // Реф для белой стрелки (сфера для hit-тестинга)
  const whiteSphereRef = useRef<THREE.Mesh | null>(null);

  const { normalizeY, normalizeZ } = useScale();
  const [isDragging, setIsDragging] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
        console.log("[BetLines] userBalance:", balance);
      } catch (err) {
        console.error("[BetLines] Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // Вычисляем агрегатор (жёлтый вектор) на основе previousBetEnd
  // Если данные с бэка отсутствуют (например, previousBetEnd.y и .z равны 0), возвращаем null
  const aggregatorClipped = useMemo(() => {
    if (previousBetEnd.y === 0 && previousBetEnd.z === 0) {
      return null;
    }
    const normY = normalizeY(previousBetEnd.y);
    const normZ = normalizeZ(previousBetEnd.z);
    const vec2 = new THREE.Vector2(normY, normZ);
    vec2.clampLength(0, maxYellowLength);
    return new THREE.Vector3(1, vec2.x, vec2.y);
  }, [previousBetEnd, maxYellowLength, normalizeZ, normalizeY]);

  // Вычисляем белый вектор (ставку)
  const computedBetPosition = useMemo(() => {
    if (!aggregatorClipped) {
      return null;
    }
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        console.log("[BetLines] stored betPosition:", stored);
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          return new THREE.Vector3(2, arr[0], arr[1]);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }
    // Если предыдущая ставка пользователя равна нулевому вектору
    if (userPreviousBet.x === 0 && userPreviousBet.y === 0 && userPreviousBet.z === 0) {
      const minDelta = 0.0001;
      let baseVector = aggregatorClipped.clone();
      if (isVectorZero(baseVector)) {
        baseVector = new THREE.Vector3(3, 3, 1);
      }
      const direction = baseVector.clone().normalize();
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
      }
      const offset = direction.multiplyScalar(minDelta);
      return baseVector.add(offset).setX(2);
    }
    // Иначе вычисляем смещение
    const deltaX = userPreviousBet.x - aggregatorClipped.x;
    const deltaY = normalizeY(userPreviousBet.y - aggregatorClipped.y);
    const deltaZ = normalizeZ(userPreviousBet.z - aggregatorClipped.z);
    const delta = new THREE.Vector3(deltaX, deltaY, deltaZ);
    delta.clampLength(0, maxWhiteLength);
    return aggregatorClipped.clone().add(delta).setX(2);
  }, [aggregatorClipped, userPreviousBet, maxWhiteLength, normalizeZ, normalizeY]);

  // Если данные с бэка ещё не пришли или computedBetPosition не вычислился, не рендерим компонент
  if (!visible || !aggregatorClipped || !computedBetPosition) {
    return null;
  }

  // Теперь можно безопасно использовать aggregatorClipped и computedBetPosition
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(
    computedBetPosition,
  );

  useEffect(() => {
    if (betPosition) {
      updateBetPosition(betPosition);
    }
  }, [betPosition, updateBetPosition]);

  // Функция для клонирования вектора
  const getRawVector = (vec: THREE.Vector3): THREE.Vector3 => vec.clone();
  const scaleFactor = 1;

  console.log(
    "[BetLines] aggregatorClipped:",
    aggregatorClipped.x,
    aggregatorClipped.y,
    aggregatorClipped.z,
  );

  const rawAggregator = getRawVector(aggregatorClipped);
  console.log(
    "rawAggregator",
    rawAggregator.x,
    rawAggregator.y,
    rawAggregator.z,
  );
  const scaledAggregator = rawAggregator.clone().multiplyScalar(scaleFactor);
  console.log(
    "scaledAggregator",
    scaledAggregator.x,
    scaledAggregator.y,
    scaledAggregator.z,
  );
  scaledAggregator.x = 1; // Фиксируем ось X для жёлтого вектора

  const rawBet = betPosition ? getRawVector(betPosition) : null;
  const scaledBet = rawBet ? rawBet.clone().multiplyScalar(scaleFactor) : null;
  if (scaledBet) scaledBet.x = 2; // Фиксируем ось X для белого вектора

  // Отрисовка жёлтого вектора (агрегатора)
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    console.log("[BetLines] yellowFinal:", scaledAggregator.toArray());
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0,
      0,
      0,
      scaledAggregator.x,
      scaledAggregator.y,
      scaledAggregator.z,
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" }),
    );
    yCone.position.copy(scaledAggregator);
    yCone.position.x = 1;
    {
      const desiredDir = scaledAggregator.clone().normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
    groupRef.current.add(yCone);
    return () => {
      if (groupRef.current && yellowLineRef.current)
        groupRef.current.remove(yellowLineRef.current);
      if (groupRef.current && yellowConeRef.current)
        groupRef.current.remove(yellowConeRef.current);
    };
  }, [aggregatorClipped, visible, scaledAggregator]);

  // Обновление позиции жёлтого вектора
  useEffect(() => {
    if (!visible) return;
    const updatedAgg = getRawVector(aggregatorClipped)
      .clone()
      .multiplyScalar(scaleFactor);
    updatedAgg.x = 1;
    if (
      yellowLineRef.current &&
      yellowLineRef.current.geometry instanceof LineGeometry
    ) {
      const positions = [0, 0, 0, updatedAgg.x, updatedAgg.y, updatedAgg.z];
      yellowLineRef.current.geometry.setPositions(positions);
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(updatedAgg);
      yellowConeRef.current.position.x = updatedAgg.x;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = updatedAgg.clone().normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
  }, [aggregatorClipped, visible]);

  // Логика перетаскивания с использованием whiteSphereRef для hit-тестинга
  const isClickOnSphere = useCallback(
    (evt: PointerEvent) => {
      console.log(
        "[BetLines] isClickOnSphere: pointer event",
        evt.clientX,
        evt.clientY,
      );
      if (!whiteSphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObject(whiteSphereRef.current);
      console.log("[BetLines] isClickOnSphere: hits", hits);
      return hits.length > 0;
    },
    [camera, gl.domElement],
  );

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const initialBetPosition = useRef<THREE.Vector3 | null>(null);

  const handlePointerDown = useCallback(
    (evt: PointerEvent) => {
      evt.stopPropagation();
      if (isClickOnSphere(evt)) {
        setIsDragging(true);
        onDragging(true);
        pointerStart.current = { x: evt.clientX, y: evt.clientY };
        // Здесь aggregatorClipped гарантированно не равен null (проверено выше)
        initialBetPosition.current = betPosition
          ? betPosition.clone()
          : aggregatorClipped.clone();
      }
      console.log("initialBetPosition (mode Z):", initialBetPosition.current);
    },
    [isClickOnSphere, onDragging, betPosition, aggregatorClipped],
  );

  const handlePointerMove = useCallback(
    (evt: PointerEvent) => {
      if (!isDragging) return;
      if (axisMode === "Y" || axisMode === "Z") {
        if (!pointerStart.current || !initialBetPosition.current) return;
        const conversionFactor = 0.01;
        const newPos = initialBetPosition.current.clone();

        if (axisMode === "Y") {
          const deltaY = evt.clientY - pointerStart.current.y;
          newPos.y -= deltaY * conversionFactor;
          newPos.z = initialBetPosition.current.z;
        } else if (axisMode === "Z") {
          const deltaY = evt.clientY - pointerStart.current.y;
          newPos.z += deltaY * conversionFactor;
          // newPos.y = initialBetPosition.current.y;
        }
        newPos.x = 2; // Фиксированное значение для оси X
        setBetPosition(newPos);
        handleDrag(newPos);
      }
    },
    [axisMode, isDragging, handleDrag],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);
    const finalDir = betPosition
      ? betPosition.clone().sub(aggregatorClipped)
      : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betPosition
        ? [betPosition.x, betPosition.y, betPosition.z]
        : [0, 0, 0],
    });
    pointerStart.current = null;
    initialBetPosition.current = null;
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    maxWhiteLength,
    userBalance,
    onDragging,
    onShowConfirmButton,
  ]);

  useEffect(() => {
    const c = gl.domElement;
    c.addEventListener("pointerdown", handlePointerDown);
    c.addEventListener("pointermove", handlePointerMove);
    c.addEventListener("pointerup", handlePointerUp);
    return () => {
      c.removeEventListener("pointerdown", handlePointerDown);
      c.removeEventListener("pointermove", handlePointerMove);
      c.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <group ref={groupRef}>
      <WhileLine
        aggregator={aggregatorClipped}
        betPosition={betPosition}
        userPreviousBet={userPreviousBet}
        visible={visible}
        sphereRef={whiteSphereRef}
      />
    </group>
  );
};

export default BetLines;
