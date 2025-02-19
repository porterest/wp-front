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

// Интерфейс пропсов
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
  setBetAmount: (newAmount: number) => void;
  axisMode: "X" | "Y";
  visible: boolean;
}

const LOCAL_KEY = "userBetVector";

// Проверка, является ли вектор нулевым (с эпсилоном)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

const BetLines: React.FC<BetLinesProps> = ({
  previousBetEnd,
  userPreviousBet,
  onDragging,
  onShowConfirmButton,
  maxYellowLength,
  maxWhiteLength,
  handleDrag,
  setBetAmount,
  axisMode,
  visible,
}) => {
  // Получаем объекты Three.js
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

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

  // Вычисляем агрегатор (желтый вектор) на основе previousBetEnd
  const aggregatorClipped = useMemo(() => {
    const normX = normalizeZ(previousBetEnd.x);
    const normY = normalizeY(previousBetEnd.y);
    const vec2 = new THREE.Vector2(normX, normY);
    vec2.clampLength(0, maxYellowLength);
    return new THREE.Vector3(vec2.x, vec2.y, 1);
  }, [previousBetEnd, maxYellowLength, normalizeZ, normalizeY]);

  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet],
  );

  // Вычисляем белый вектор (ставку)
  const computedBetPosition = useMemo(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          return new THREE.Vector3(arr[0], arr[1], 2);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }
    if (isUserBetZero) {
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
      return baseVector.add(offset).setZ(2);
    }
    const deltaX = normalizeZ(userPreviousBet.x - aggregatorClipped.x);
    const deltaY = normalizeY(userPreviousBet.y - aggregatorClipped.y);
    const deltaZ = userPreviousBet.z - aggregatorClipped.z;
    const delta = new THREE.Vector3(deltaX, deltaY, deltaZ);
    delta.clampLength(0, maxWhiteLength);
    return aggregatorClipped.clone().add(delta).setZ(2);
  }, [
    aggregatorClipped,
    userPreviousBet,
    isUserBetZero,
    maxWhiteLength,
    normalizeZ,
    normalizeY,
  ]);

  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(
    computedBetPosition,
  );

  useEffect(() => {
    // if (isDragging) return;
    setBetPosition(computedBetPosition);
  }, [computedBetPosition, isDragging]);

  // Функция для получения "сырых" нормализованных координат (без масштабирования)
  // Функция для получения "сырых" координат – больше без нормализации
  const getRawVector = (vec: THREE.Vector3): THREE.Vector3 => {
    return vec.clone();
  };

  // --- Единое масштабирование для отрисовки ---
  // Масштабирование применяется к "сырым" координатам агрегатора и белого вектора
  const scaleFactor = 0.4;
  const rawAggregator = getRawVector(aggregatorClipped);
  const scaledAggregator = rawAggregator.clone().multiplyScalar(scaleFactor);
  scaledAggregator.z = 1; // фиксируем z для желтого вектора
  const rawBet = betPosition ? getRawVector(betPosition) : null;
  const scaledBet = rawBet ? rawBet.clone().multiplyScalar(scaleFactor) : null;
  if (scaledBet) scaledBet.z = 2; // фиксируем z для белого вектора

  // Для отрисовки: желтый вектор — scaledAggregator, белый — scaledBet

  // ----- Отрисовка желтого вектора (агрегатора) -----
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
    yCone.position.z = 1;
    {
      const desiredDir = scaledAggregator.clone().normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(
          defaultDir,
          desiredDir,
        );
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

  // ----- Отрисовка белой стрелки (ставки) -----
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition || !scaledBet) {
      console.log("[BetLines] Нет betPosition – удаляем белые объекты");
      if (groupRef.current && whiteLineRef.current)
        groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current)
        groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current)
        groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    } else {
      console.log(
        "[BetLines] Есть и агрегатор, и betPosition:",
        betPosition.toArray(),
      );
    }
    console.log("[BetLines] whiteFinal:", scaledBet.toArray());

    const wGeom = new LineGeometry();
    wGeom.setPositions([
      scaledAggregator.x,
      scaledAggregator.y,
      scaledAggregator.z,
      scaledBet.x,
      scaledBet.y,
      scaledBet.z,
    ]);

    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" }),
    );
    wCone.position.copy(scaledBet);
    wCone.position.z = 2;
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isVectorZero(userPreviousBet)) {
        desiredDir = new THREE.Vector3(
          betPosition!.x,
          betPosition!.y,
          2,
        ).normalize();
      } else {
        desiredDir = betPosition!.clone().sub(aggregatorClipped).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(
          defaultDir,
          desiredDir,
        );
        wCone.setRotationFromQuaternion(quat);
      }
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      }),
    );
    sph.position.copy(scaledBet);
    groupRef.current.add(sph);
    sphereRef.current = sph;

    return () => {
      if (groupRef.current && whiteLineRef.current)
        groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current)
        groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current)
        groupRef.current.remove(sphereRef.current);
    };
  }, [
    aggregatorClipped,
    betPosition,
    visible,
    scaledBet,
    isVectorZero,
    userPreviousBet,
  ]);

  // ----- Обновление геометрии/позиций объектов -----
  useEffect(() => {
    if (!visible) return;
    const updatedAgg = getRawVector(aggregatorClipped)
      .clone()
      .multiplyScalar(scaleFactor);
    updatedAgg.z = 1;
    const updatedBet = betPosition
      ? getRawVector(betPosition).clone().multiplyScalar(scaleFactor)
      : null;
    if (updatedBet) updatedBet.z = 2;

    if (
      yellowLineRef.current &&
      yellowLineRef.current.geometry instanceof LineGeometry
    ) {
      const positions = [0, 0, 0, updatedAgg.x, updatedAgg.y, updatedAgg.z];
      yellowLineRef.current.geometry.setPositions(positions);
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(updatedAgg);
      yellowConeRef.current.position.z = updatedAgg.z;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = updatedAgg.clone().normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(
          defaultDir,
          desiredDir,
        );
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry instanceof LineGeometry &&
      updatedBet
    ) {
      const positions = [
        updatedAgg.x,
        updatedAgg.y,
        updatedAgg.z,
        updatedBet.x,
        updatedBet.y,
        updatedBet.z,
      ];
      whiteLineRef.current.geometry.setPositions(positions);
    }
    if (whiteConeRef.current && updatedBet) {
      whiteConeRef.current.position.copy(updatedBet);
      whiteConeRef.current.position.z = updatedBet.z;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = isVectorZero(userPreviousBet)
        ? updatedBet.clone().normalize()
        : updatedBet.clone().sub(updatedAgg).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(
          defaultDir,
          desiredDir,
        );
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current && updatedBet) {
      sphereRef.current.position.copy(updatedBet);
      sphereRef.current.position.z = updatedBet.z;
    }
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry &&
      whiteLineRef.current.geometry.attributes.position
    ) {
      whiteLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [aggregatorClipped, betPosition, visible, scaleFactor, userPreviousBet]);

  // ----- Логика перетаскивания -----
  const isClickOnSphere = useCallback(
    (evt: PointerEvent) => {
      console.log(
        "[BetLines] isClickOnSphere: pointer event",
        evt.clientX,
        evt.clientY,
      );
      if (!sphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObject(sphereRef.current);
      console.log("[BetLines] isClickOnSphere: hits", hits);
      return hits.length > 0;
    },
    [camera, gl.domElement],
  );

  const handlePointerDown = useCallback(
    (evt: PointerEvent) => {
      evt.stopPropagation();
      console.log("[BetLines] handlePointerDown", evt.clientX, evt.clientY);
      if (isClickOnSphere(evt)) {
        console.log("[BetLines] Нажатие на сферу");
        setIsDragging(true);
        onDragging(true);
      }
    },
    [isClickOnSphere, onDragging],
  );

  const handlePointerMove = useCallback(
    (evt: PointerEvent) => {
      if (!isDragging) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera);

      // Используем позицию сферы в масштабированной системе как копланарную точку
      const coplanarPointScaled = sphereRef.current
        ? sphereRef.current.position.clone() // уже масштабирована
        : scaledAggregator.clone();

      // Вычисляем плоскость в масштабированных координатах
      plane.current.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
        coplanarPointScaled,
      );

      const intersectScaled = new THREE.Vector3();
      const intersectExists = raycaster.current.ray.intersectPlane(
        plane.current,
        intersectScaled,
      );
      console.log(
        "[BetLines] intersect (scaled):",
        intersectExists,
        intersectScaled.toArray(),
      );
      if (!intersectExists) {
        console.log("[BetLines] Нет пересечения с плоскостью");
        return;
      }

      // Рассчитываем новое положение в масштабированной системе:
      // Начинаем с масштабированного агрегатора и прибавляем смещение (direction)
      const directionScaled = intersectScaled.clone().sub(scaledAggregator);
      let newPosScaled = new THREE.Vector3();
      if (axisMode === "X") {
        newPosScaled.x = scaledAggregator.x + directionScaled.x;
        newPosScaled.y = scaledBet ? scaledBet.y : scaledAggregator.y; // сохраняем старое y
        newPosScaled.z = scaledAggregator.z;
      } else if (axisMode === "Y") {
        newPosScaled.y = scaledAggregator.y + directionScaled.y;
        newPosScaled.x = scaledBet ? scaledBet.x : scaledAggregator.x;
        newPosScaled.z = scaledAggregator.z;
      } else {
        newPosScaled = scaledAggregator.clone().add(directionScaled);
      }

      // Ограничиваем длину векторного смещения (в масштабированных координатах)
      const maxWhiteLengthScaled = maxWhiteLength * scaleFactor;
      const finalDirScaled = newPosScaled.clone().sub(scaledAggregator);
      if (finalDirScaled.length() > maxWhiteLengthScaled) {
        finalDirScaled.setLength(maxWhiteLengthScaled);
        newPosScaled = scaledAggregator.clone().add(finalDirScaled);
      }

      // Преобразуем новое положение обратно в исходную систему координат
      const newPos = newPosScaled.clone().divideScalar(scaleFactor);
      console.log(
        "[BetLines] Новая позиция для ставки (original):",
        newPos.toArray(),
      );

      setBetPosition(newPos);
      const fraction = finalDirScaled.length() / maxWhiteLengthScaled;
      setBetAmount(userBalance * fraction);
      handleDrag(newPos);
    },
    [
      isDragging,
      scaledAggregator,
      scaledBet,
      axisMode,
      camera,
      gl.domElement,
      maxWhiteLength,
      userBalance,
      handleDrag,
      setBetAmount,
      scaleFactor,
    ],
  );

  const handlePointerUp = useCallback(() => {
    console.log("[BetLines] handlePointerUp");
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);
    const finalDir = betPosition
      ? betPosition.clone().sub(aggregatorClipped)
      : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betPosition
        ? [betPosition.x, betPosition.y, betPosition.z]
        : [0, 0, 0],
    });
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    maxWhiteLength,
    userBalance,
    onDragging,
    onShowConfirmButton,
    setBetAmount,
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

  if (!visible) return null;
  return <group ref={groupRef} />;
};

export default BetLines;
