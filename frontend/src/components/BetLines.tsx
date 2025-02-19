import React, { useCallback, useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fetchUserBalances } from "../services/api";
import { Line } from "three";
import { useScale } from "../context/ScaleContext";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Формат: { x: транзакции, y: цена, z: время }
  userPreviousBet: THREE.Vector3;    // Формат: { x: транзакции, y: цена, z: время }
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  handleDrag: (newPosition: THREE.Vector3) => void;
  setBetAmount: (newAmount: number) => void;
  axisMode: "X" | "Y";
  visible: boolean;
}

const LOCAL_KEY = "userBetVector";

// Проверка нулевого вектора
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             handleDrag,
                                             setBetAmount,
                                             axisMode,
                                             visible,
                                           }) => {
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ссылки на объекты сцены
  const yellowLineRef = useRef<Line | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // Для осей Y и Z используем функции нормализации из контекста
  const { normalizeY, normalizeZ } = useScale();

  // Для оси X у нас не применяется функция из контекста – мы используем normalizeZ
  // согласно вашему требованию, поэтому порядок остаётся таким, как есть.

  // Состояния
  const [isDragging, setIsDragging] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [aggregator, setAggregator] = useState<THREE.Vector3>(new THREE.Vector3());
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(null);

  // Получение баланса пользователя
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

  // Присваиваем агрегатору входное значение (без swap – порядок оставляем как есть)
  useEffect(() => {
    if (isVectorZero(previousBetEnd)) return;
    console.log("previousBetEnd changed:", previousBetEnd);
    setAggregator(previousBetEnd);
    console.log("aggregator:", previousBetEnd.toArray());
  }, [previousBetEnd]);

  // Инициализация вектора ставки
  useEffect(() => {
    if (isVectorZero(previousBetEnd)) return;
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] storage:", arr);
          setBetPosition(new THREE.Vector3(arr[0], arr[1], arr[2]));
          return;
        }
      }
    } catch (err) {
      console.error("[BetLines] Error parsing LS:", err);
    }
    setBetPosition(userPreviousBet);
  }, [userPreviousBet, previousBetEnd]);

  // Для отрисовки нам нужно сначала вычислить "сырые" нормализованные значения
  // согласно вашему порядку: x через normalizeZ, y через normalizeY, z фиксированное (без нормализации)
  const getRawVector = (vec: THREE.Vector3): THREE.Vector3 => {
    return new THREE.Vector3(
      normalizeZ(vec.x),
      normalizeY(vec.y),
      vec.z // оставляем как есть (например, 1)
    );
  };

  // Теперь задаём масштабирование:
  // Желтый вектор (агрегатор) должен быть масштабирован так, чтобы его итоговая длина (по каждой оси) была максимум 2.5.
  // Если rawYellow находится в диапазоне [0, 5], то умножаем на 0.5.
  const yellowFinal = getRawVector(aggregator).clone().multiplyScalar(0.5);

  // Для белой стрелки: вычисляем raw белый вектор; затем delta = rawWhite - rawYellow,
  // масштабируем delta так, чтобы её максимум был 2 (коэффициент 2/5 = 0.4) и прибавляем к yellowFinal.
  const whiteFinal = betPosition
    ? yellowFinal.clone().add(
      getRawVector(betPosition).sub(getRawVector(aggregator)).multiplyScalar(0.4)
    )
    : null;

  // Отрисовка агрегатора (желтая стрелка)
  useEffect(() => {
    if (!visible || isVectorZero(aggregator)) return;
    if (!groupRef.current) return;
    console.log("[BetLines] normalizedAggregator (final yellow):", yellowFinal.toArray());
    const yellowGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, yellowFinal.z),
      yellowFinal,
    ]);
    const yellowMaterial = new THREE.LineBasicMaterial({ color: "yellow", linewidth: 3 });
    const yLine = new THREE.Line(yellowGeometry, yellowMaterial);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(yellowFinal);
    {
      const desiredDir = yellowFinal.clone().normalize();
      const defaultDir = new THREE.Vector3(0, 0, 1);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
    groupRef.current.add(yCone);
    return () => {
      if (groupRef.current && yellowLineRef.current) {
        groupRef.current.remove(yellowLineRef.current);
      }
      if (groupRef.current && yellowConeRef.current) {
        groupRef.current.remove(yellowConeRef.current);
      }
    };
  }, [aggregator, visible, yellowFinal]);

  // Отрисовка ставки (белая стрелка)
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition || !whiteFinal) {
      if (groupRef.current && whiteLineRef.current) groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current) groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current) groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    }
    console.log("Ненормализованный агрегатор (желтый):", aggregator.toArray());
    console.log("Ненормализованный белый:", betPosition.toArray());
    console.log("Normalized белый (final):", whiteFinal?.toArray());
    const whiteGeometry = new THREE.BufferGeometry().setFromPoints([
      yellowFinal, // начало белой стрелки – конец желтого
      whiteFinal,
    ]);
    const whiteMaterial = new THREE.LineBasicMaterial({ color: "white", linewidth: 3 });
    const wLine = new THREE.Line(whiteGeometry, whiteMaterial);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isVectorZero(userPreviousBet)) {
        desiredDir = whiteFinal.clone().normalize();
      } else {
        desiredDir = whiteFinal.clone().sub(yellowFinal).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        wCone.setRotationFromQuaternion(quat);
      }
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({ color: "blue", opacity: 0.5, transparent: true })
    );
    sph.position.copy(whiteFinal);
    groupRef.current.add(sph);
    sphereRef.current = sph;
    return () => {
      if (groupRef.current && whiteLineRef.current) {
        groupRef.current.remove(whiteLineRef.current);
      }
      if (groupRef.current && whiteConeRef.current) {
        groupRef.current.remove(whiteConeRef.current);
      }
      if (groupRef.current && sphereRef.current) {
        groupRef.current.remove(sphereRef.current);
      }
    };
  }, [aggregator, betPosition, visible, whiteFinal]);

  // Обновление позиций объектов при изменениях
  useEffect(() => {
    if (!visible) return;
    const normalizedAggregator = new THREE.Vector3(
      normalizeZ(aggregator.x),
      normalizeY(aggregator.y),
      aggregator.z
    ).multiplyScalar(0.5);
    const normalizedBetPosition = betPosition
      ? normalizedAggregator.clone().add(
        getRawVector(betPosition)
          .sub(getRawVector(aggregator))
          .multiplyScalar(0.4)
      )
      : null;
    console.log("Normalized aggregator (yellowFinal)", normalizedAggregator.toArray());
    console.log("Normalized bet (whiteFinal)", normalizedBetPosition?.toArray());
    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof THREE.BufferGeometry) {
      const positions = new Float32Array([
        0, 0, normalizedAggregator.z,
        normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z,
      ]);
      const attr = yellowLineRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.array.set(positions);
      attr.needsUpdate = true;
      yellowLineRef.current.geometry.computeBoundingSphere();
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(normalizedAggregator);
      const desiredDir = normalizedAggregator.clone().normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (whiteLineRef.current && whiteLineRef.current.geometry instanceof THREE.BufferGeometry && normalizedBetPosition) {
      const positions = new Float32Array([
        normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z,
        normalizedBetPosition.x, normalizedBetPosition.y, normalizedBetPosition.z,
      ]);
      const attr = whiteLineRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.array.set(positions);
      attr.needsUpdate = true;
      whiteLineRef.current.geometry.computeBoundingSphere();
    }
    if (whiteConeRef.current && normalizedBetPosition) {
      whiteConeRef.current.position.copy(normalizedBetPosition);
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = isVectorZero(userPreviousBet)
        ? normalizedBetPosition.clone().normalize()
        : normalizedBetPosition.clone().sub(normalizedAggregator).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current && normalizedBetPosition) {
      sphereRef.current.position.copy(normalizedBetPosition);
    }
  }, [aggregator, betPosition, visible]);

  // Фиксированная плоскость для перетаскивания
  useEffect(() => {
    plane.current.copy(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1));
    console.log("[BetLines] Fixed plane: z = 1");
  }, []);

  // Логика перетаскивания (оставлена без изменений)
  const isClickOnSphere = useCallback((evt: PointerEvent) => {
    console.log("[BetLines] isClickOnSphere: pointer event", evt.clientX, evt.clientY);
    if (!sphereRef.current) return false;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    console.log("[BetLines] isClickOnSphere: hits", hits);
    return hits.length > 0;
  }, [camera, gl.domElement]);

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    evt.stopPropagation();
    console.log("[BetLines] handlePointerDown", evt.clientX, evt.clientY);
    if (isClickOnSphere(evt)) {
      console.log("[BetLines] Click on sphere");
      setIsDragging(true);
      onDragging(true);
    }
  }, [isClickOnSphere, onDragging]);

  const handlePointerMove = useCallback((evt: PointerEvent) => {
    if (!isDragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    plane.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
      aggregator
    );
    const intersect = new THREE.Vector3();
    const intersectExists = raycaster.current.ray.intersectPlane(plane.current, intersect);
    console.log("[BetLines] intersect", intersectExists, intersect.toArray());
    if (!intersectExists) {
      console.log("[BetLines] No intersection with plane");
      return;
    }
    const direction = intersect.clone().sub(aggregator);
    let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();
    if (axisMode === "X") {
      newPos.x = aggregator.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregator.y + direction.y;
    } else {
      newPos = aggregator.clone().add(direction);
    }
    console.log("[BetLines] New bet position:", newPos.toArray());
    setBetPosition(newPos);
    const fraction = direction.length() / 1;
    setBetAmount(userBalance * fraction);
    handleDrag(newPos);
  }, [
    isDragging,
    aggregator,
    betPosition,
    axisMode,
    camera,
    gl.domElement,
    userBalance,
    handleDrag,
    setBetAmount
  ]);

  const handlePointerUp = useCallback(() => {
    console.log("[BetLines] handlePointerUp");
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);
    const finalDir = betPosition ? betPosition.clone().sub(aggregator) : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / 1, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);
    const predictedVector = betPosition ? betPosition.toArray() : [0, 0, 0];
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: predictedVector,
    });
  }, [
    isDragging,
    aggregator,
    betPosition,
    userBalance,
    onDragging,
    onShowConfirmButton,
    setBetAmount
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
