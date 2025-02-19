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

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // { x: транзакции, y: цена, z: время }
  userPreviousBet: THREE.Vector3;    // { x: транзакции, y: цена, z: время }
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  setBetAmount: (newAmount: number) => void;
  axisMode: "X" | "Y";
  visible: boolean;
}

const LOCAL_KEY = "userBetVector";

// Проверка нулевого вектора (с эпсилон)
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
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ссылки на объекты сцены
  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // Функции нормализации из контекста:
  // normalizeZ – для оси X, normalizeY – для оси Y (как требуется)
  const { normalizeY, normalizeZ } = useScale();

  const [isDragging, setIsDragging] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (err) {
        console.error("[BetLines] Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // ─── Шаг 1. Вычисляем "raw normalized" координаты ─────────────────────────
  // Сначала нормализуем реальные координаты через normalizeZ/normalizeY.
  // Затем, если длина полученного 2D-вектора превышает maxYellowLength, ограничиваем её.
  // Для агрегатора фиксируем z = 1.
  const aggregatorNormalizedRaw = useMemo(() => {
    const normX = normalizeZ(previousBetEnd.x);
    const normY = normalizeY(previousBetEnd.y);
    const vec2 = new THREE.Vector2(normX, normY);
    vec2.clampLength(0, maxYellowLength);
    return new THREE.Vector3(vec2.x, vec2.y, 1);
  }, [previousBetEnd, maxYellowLength, normalizeZ, normalizeY]);

  // Флаг: равен ли userPreviousBet нулевому вектору
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

  // Вычисляем "raw normalized" вектор ставки (без render-скейла).
  const computedBetNormalizedRaw = useMemo(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          // Предполагаем, что в LS уже сохранены нормализованные координаты
          return new THREE.Vector3(arr[0], arr[1], 2);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }

    if (isUserBetZero) {
      const minDelta = 0.0001;
      let base = aggregatorNormalizedRaw.clone();
      if (isVectorZero(base)) {
        base = new THREE.Vector3(3, 3, 1);
      }
      const dir = base.clone().normalize();
      if (dir.length() === 0) {
        dir.set(1, 0, 0);
      }
      const offset = dir.multiplyScalar(minDelta);
      return base.add(offset).setZ(2);
    }

    // Сначала нормализуем реальные координаты userPreviousBet
    const userNormX = normalizeZ(userPreviousBet.x);
    const userNormY = normalizeY(userPreviousBet.y);
    const userNormalized = new THREE.Vector3(userNormX, userNormY, userPreviousBet.z);
    const delta = userNormalized.clone().sub(aggregatorNormalizedRaw);
    delta.clampLength(0, maxWhiteLength);
    return aggregatorNormalizedRaw.clone().add(delta).setZ(2);
  }, [aggregatorNormalizedRaw, userPreviousBet, isUserBetZero, maxWhiteLength, normalizeZ, normalizeY]);

  // Состояние для вектора ставки (raw normalized)
  const [betNormalizedRaw, setBetNormalizedRaw] = useState<THREE.Vector3 | null>(
    computedBetNormalizedRaw
  );
  useEffect(() => {
    setBetNormalizedRaw(computedBetNormalizedRaw);
  }, [computedBetNormalizedRaw]);

  // ─── Шаг 2. Вычисляем координаты для отрисовки ─────────────────────────────
  // Если функции нормализации возвращают значения от 0 до 5,
  // можно применить renderScale, чтобы привести диапазон, например, к [0, 2.5].
  const renderScale = 0.5;
  const yellowFinal = useMemo(() => {
    const v = aggregatorNormalizedRaw.clone().multiplyScalar(renderScale);
    v.z = 1;
    return v;
  }, [aggregatorNormalizedRaw, renderScale]);

  const whiteFinal = useMemo(() => {
    if (!betNormalizedRaw) return null;
    const v = betNormalizedRaw.clone().multiplyScalar(renderScale);
    v.z = 2;
    return v;
  }, [betNormalizedRaw, renderScale]);

  // ─── Отрисовка агрегатора (желтого вектора) ────────────────────────────────
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorNormalizedRaw)) return;
    if (!groupRef.current) return;
    // Желтая линия: от (0,0,0) до yellowFinal
    const yGeom = new LineGeometry();
    yGeom.setPositions([0, 0, 0, yellowFinal.x, yellowFinal.y, yellowFinal.z]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);

    // Желтый конус в конце линии
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(yellowFinal);
    yCone.position.z = 1;
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = yellowFinal.clone().normalize();
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
  }, [aggregatorNormalizedRaw, yellowFinal, visible]);

  // ─── Отрисовка белой стрелки (ставки) ──────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betNormalizedRaw || !whiteFinal) {
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
    }
    // Белая линия: от yellowFinal до whiteFinal
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      yellowFinal.x,
      yellowFinal.y,
      yellowFinal.z,
      whiteFinal.x,
      whiteFinal.y,
      whiteFinal.z,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Белый конус
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    wCone.position.copy(whiteFinal);
    wCone.position.z = 2;
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isVectorZero(userPreviousBet)) {
        desiredDir = new THREE.Vector3(betNormalizedRaw!.x, betNormalizedRaw!.y, 2).normalize();
      } else {
        desiredDir = betNormalizedRaw!.clone().sub(aggregatorNormalizedRaw).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        wCone.setRotationFromQuaternion(quat);
      }
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Сфера для перетаскивания
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      })
    );
    sph.position.copy(whiteFinal);
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
  }, [aggregatorNormalizedRaw, betNormalizedRaw, visible, whiteFinal, userPreviousBet]);

  // ─── Обновление геометрии при изменениях (используем render-координаты) ─────
  useEffect(() => {
    if (!visible) return;
    const normalizedYellow = yellowFinal; // уже с renderScale
    const normalizedBet = betNormalizedRaw
      ? whiteFinal
      : null;
    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof LineGeometry) {
      const positions = [
        0,
        0,
        normalizedYellow.z,
        normalizedYellow.x,
        normalizedYellow.y,
        normalizedYellow.z,
      ];
      yellowLineRef.current.geometry.setPositions(positions);
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(normalizedYellow);
      yellowConeRef.current.position.z = normalizedYellow.z;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = normalizedYellow.clone().normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry instanceof LineGeometry &&
      normalizedBet
    ) {
      const positions = [
        normalizedYellow.x,
        normalizedYellow.y,
        normalizedYellow.z,
        normalizedBet.x,
        normalizedBet.y,
        normalizedBet.z,
      ];
      whiteLineRef.current.geometry.setPositions(positions);
    }
    if (whiteConeRef.current && normalizedBet) {
      whiteConeRef.current.position.copy(normalizedBet);
      whiteConeRef.current.position.z = normalizedBet.z;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = isVectorZero(userPreviousBet)
        ? normalizedBet.clone().normalize()
        : normalizedBet.clone().sub(normalizedYellow).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current && normalizedBet) {
      sphereRef.current.position.copy(normalizedBet);
      sphereRef.current.position.z = normalizedBet.z;
    }
  }, [aggregatorNormalizedRaw, betNormalizedRaw, visible]);

  // ─── Логика перетаскивания ────────────────────────────────────────────────
  const isClickOnSphere = useCallback(
    (evt: PointerEvent) => {
      if (!sphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObject(sphereRef.current);
      return hits.length > 0;
    },
    [camera, gl.domElement]
  );

  const handlePointerDown = useCallback(
    (evt: PointerEvent) => {
      evt.stopPropagation();
      if (isClickOnSphere(evt)) {
        setIsDragging(true);
        onDragging(true);
      }
    },
    [isClickOnSphere, onDragging]
  );

  const handlePointerMove = useCallback(
    (evt: PointerEvent) => {
      if (!isDragging) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      // Работает в системе raw normalized координат
      plane.current.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
        aggregatorNormalizedRaw
      );
      const intersect = new THREE.Vector3();
      const intersectExists = raycaster.current.ray.intersectPlane(plane.current, intersect);
      if (!intersectExists) return;
      const direction = intersect.clone().sub(aggregatorNormalizedRaw);
      let newRaw = betNormalizedRaw ? betNormalizedRaw.clone() : new THREE.Vector3();
      if (axisMode === "X") {
        newRaw.x = aggregatorNormalizedRaw.x + direction.x;
      } else if (axisMode === "Y") {
        newRaw.y = aggregatorNormalizedRaw.y + direction.y;
      } else {
        newRaw = aggregatorNormalizedRaw.clone().add(direction);
      }
      const finalDir = newRaw.clone().sub(aggregatorNormalizedRaw);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        newRaw = aggregatorNormalizedRaw.clone().add(finalDir);
      }
      setBetNormalizedRaw(newRaw);
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);
      handleDrag(newRaw);
    },
    [
      isDragging,
      aggregatorNormalizedRaw,
      betNormalizedRaw,
      axisMode,
      camera,
      gl.domElement,
      maxWhiteLength,
      userBalance,
      handleDrag,
      setBetAmount,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);
    const finalDir = betNormalizedRaw ? betNormalizedRaw.clone().sub(aggregatorNormalizedRaw) : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betNormalizedRaw ? [betNormalizedRaw.x, betNormalizedRaw.y, betNormalizedRaw.z] : [0, 0, 0],
    });
  }, [
    isDragging,
    aggregatorNormalizedRaw,
    betNormalizedRaw,
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
