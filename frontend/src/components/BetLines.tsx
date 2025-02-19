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
  previousBetEnd: THREE.Vector3;   // Формат: { x: транзакции, y: цена, z: время }
  userPreviousBet: THREE.Vector3;    // Формат: { x: транзакции, y: цена, z: время }
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

  // Для осей Y и Z используем функции нормализации из контекста.
  // Согласно вашим требованиям: x нормализуем через normalizeZ, y – через normalizeY.
  const { normalizeY, normalizeZ } = useScale();

  // Состояния перетаскивания и баланс
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

  // --- Вычисление жёлтого вектора (агрегатора) ---
  // Мы хотим, чтобы жёлтый вектор всегда начинался в (0,0,0) и имел длину maxYellowLength,
  // а его z фиксировано равнялось 1.
  const aggregatorClipped = useMemo(() => {
    // Сначала нормализуем каждую координату
    const normX = normalizeZ(previousBetEnd.x);
    const normY = normalizeY(previousBetEnd.y);
    // Собираем 2D-вектор и ограничиваем его длину
    const vec2 = new THREE.Vector2(normX, normY);
    vec2.clampLength(0, maxYellowLength);
    // Возвращаем итоговый 3D-вектор с фиксированным z = 1
    return new THREE.Vector3(vec2.x, vec2.y, 1);
  }, [previousBetEnd, maxYellowLength, normalizeZ, normalizeY]);

  // Флаг, равен ли userPreviousBet (0,0,0)
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet],
  );

  // --- Инициализация белого вектора (betPosition) ---
  // Для белого вектора фиксируем z = 2 (его начало – конец жёлтого, конец – (белый вектор)).
  // Новый расчёт белого вектора (betPosition)
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

    // Если нет пользовательского вектора, используем минимальное смещение от агрегатора
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

    // Вычисляем дельту от агрегатора до пользовательского вектора
    // Сначала нормализуем разницу по отдельным осям:
    const deltaX = normalizeZ(userPreviousBet.x - aggregatorClipped.x);
    const deltaY = normalizeY(userPreviousBet.y - aggregatorClipped.y);
    const deltaZ = userPreviousBet.z - aggregatorClipped.z; // z оставляем как есть
    const delta = new THREE.Vector3(deltaX, deltaY, deltaZ);

    // Ограничиваем длину дельты, чтобы она не превышала maxWhiteLength
    delta.clampLength(0, maxWhiteLength);

    // Итоговая позиция – это агрегатор + ограниченная дельта; фиксируем z = 2
    return aggregatorClipped.clone().add(delta).setZ(2);
  }, [aggregatorClipped, userPreviousBet, isUserBetZero, maxWhiteLength, normalizeZ, normalizeY]);

// Инициализируем состояние betPosition с вычисленным значением
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(computedBetPosition);

// При изменении computedBetPosition обновляем betPosition
  useEffect(() => {
    setBetPosition(computedBetPosition);
  }, [computedBetPosition]);

  // Обновление betPosition при изменении userPreviousBet
  useEffect(() => {
    console.log("[BetLines] userPreviousBet изменился:", userPreviousBet.toArray());
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      console.log("[BetLines] LS присутствует – не обновляем betPosition");
      return;
    }
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 1
    ) {
      console.log("[BetLines] userPreviousBet равен (0,0,1) – устанавливаем betPosition как aggregatorClipped + смещение");
      if (axisMode === "X") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)).setZ(2));
      } else if (axisMode === "Y") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)).setZ(2));
      } else {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)).setZ(2));
      }
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    setBetPosition(userPreviousBet.clone().setZ(2));
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);

  // --- Функция для получения "сырых" нормализованных координат ---
  // Согласно вашим требованиям: x через normalizeZ, y через normalizeY, z берём как есть.
  const getRawVector = (vec: THREE.Vector3): THREE.Vector3 => {
    return new THREE.Vector3(
      normalizeZ(vec.x),
      normalizeY(vec.y),
      vec.z
    );
  };

  // --- Вычисляем итоговый жёлтый вектор (агрегатор) ---
  // Здесь rawYellow – это getRawVector(aggregatorClipped), а yellowFinal = rawYellow * (maxYellowLength/5)
  // поскольку функции нормализации возвращают значения от 0 до 5, умножая на (2.5/5)=0.5 получаем диапазон 0–2.5.
  const rawYellow = getRawVector(aggregatorClipped);
  const yellowFinal = rawYellow.clone().multiplyScalar(0.5);
  // Фиксируем z для жёлтого вектора равным 1
  yellowFinal.z = 1;

  // --- Вычисляем итоговый белый вектор (ставки) ---
  // Если betPosition задан, то:
  // rawWhite = getRawVector(betPosition), delta = (rawWhite - rawYellow) * 0.4 (так максимум дельты = 2),
  // и whiteFinal = yellowFinal + delta, при этом z фиксируем равным 2.
  const whiteFinal = betPosition
    ? yellowFinal
      .clone()
      .add(getRawVector(betPosition).sub(rawYellow).multiplyScalar(0.4))
    : null;
  if (whiteFinal) whiteFinal.z = 2;

  // ----- Отрисовка жёлтого вектора (агрегатора) -----
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    console.log("[BetLines] yellowFinal:", yellowFinal.toArray());
    // Жёлтая линия: старт из (0,0,0), конец = yellowFinal
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

    // Жёлтый конус: позиция = yellowFinal, z = 1
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(yellowFinal);
    yCone.position.z = 1;
    {
      const desiredDir = new THREE.Vector3(yellowFinal.x, yellowFinal.y, yellowFinal.z).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
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
  }, [aggregatorClipped, visible, yellowFinal]);

  // ----- Отрисовка белой стрелки (ставки) -----
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition || !whiteFinal) {
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
      console.log("[BetLines] Есть и агрегатор, и betPosition:", betPosition.toArray());
    }
    console.log("[BetLines] whiteFinal:", whiteFinal.toArray());
    // Белая линия: старт = yellowFinal, конец = whiteFinal
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

    // Белый конус: позиция = whiteFinal, z = 2
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
        desiredDir = new THREE.Vector3(betPosition.x, betPosition.y, 2).normalize();
      } else {
        desiredDir = betPosition.clone().sub(aggregatorClipped).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        wCone.setRotationFromQuaternion(quat);
      }
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Сфера: позиция = whiteFinal
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      }),
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
  }, [aggregatorClipped, betPosition, visible, whiteFinal, isVectorZero, userPreviousBet]);

  // ----- Обновление геометрии/позиций объектов (при изменениях) -----
  useEffect(() => {
    if (!visible) return;
    const normalizedAggregator = new THREE.Vector3(
      normalizeZ(aggregatorClipped.x),
      normalizeY(aggregatorClipped.y),
      aggregatorClipped.z,
    ).multiplyScalar(0.5);
    normalizedAggregator.z = 1;
    const normalizedBetPosition = betPosition
      ? new THREE.Vector3(
        normalizeZ(betPosition.x),
        normalizeY(betPosition.y),
        2,
      )
      : null;
    console.log("[BetLines] обновление: normalizedAggregator", normalizedAggregator.toArray());
    console.log("[BetLines] обновление: normalizedBetPosition", normalizedBetPosition?.toArray());
    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof LineGeometry) {
      const positions = [
        0,
        0,
        normalizedAggregator.z,
        normalizedAggregator.x,
        normalizedAggregator.y,
        normalizedAggregator.z,
      ];
      yellowLineRef.current.geometry.setPositions(positions);
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(normalizedAggregator);
      yellowConeRef.current.position.z = normalizedAggregator.z;
      const desiredDir = new THREE.Vector3(
        normalizedAggregator.x,
        normalizedAggregator.y,
        normalizedAggregator.z,
      ).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry instanceof LineGeometry &&
      normalizedBetPosition
    ) {
      const positions = [
        normalizedAggregator.x,
        normalizedAggregator.y,
        normalizedAggregator.z,
        normalizedBetPosition.x,
        normalizedBetPosition.y,
        normalizedBetPosition.z,
      ];
      whiteLineRef.current.geometry.setPositions(positions);
    }
    if (whiteConeRef.current && normalizedBetPosition) {
      whiteConeRef.current.position.copy(normalizedBetPosition);
      whiteConeRef.current.position.z = normalizedBetPosition.z;
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
      sphereRef.current.position.z = normalizedBetPosition.z;
    }
  }, [aggregatorClipped, betPosition, visible]);

  // ----- Логика перетаскивания -----
  const isClickOnSphere = useCallback(
    (evt: PointerEvent) => {
      console.log("[BetLines] isClickOnSphere: pointer event", evt.clientX, evt.clientY);
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
      plane.current.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
        aggregatorClipped,
      );
      const intersect = new THREE.Vector3();
      const intersectExists = raycaster.current.ray.intersectPlane(
        plane.current,
        intersect,
      );
      console.log("[BetLines] intersect", intersectExists, intersect.toArray());
      if (!intersectExists) {
        console.log("[BetLines] Нет пересечения с плоскостью");
        return;
      }
      const direction = intersect.clone().sub(aggregatorClipped);
      let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();
      if (axisMode === "X") {
        newPos.x = aggregatorClipped.x + direction.x;
      } else if (axisMode === "Y") {
        newPos.y = aggregatorClipped.y + direction.y;
      } else {
        newPos = aggregatorClipped.clone().add(direction);
      }
      // Ограничиваем длину белой стрелки
      const finalDir = newPos.clone().sub(aggregatorClipped);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        newPos = aggregatorClipped.clone().add(finalDir);
      }
      console.log("[BetLines] Новая позиция для ставки:", newPos.toArray());
      setBetPosition(newPos);
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);
      handleDrag(newPos);
    },
    [
      isDragging,
      aggregatorClipped,
      betPosition,
      axisMode,
      camera,
      gl.domElement,
      maxWhiteLength,
      userBalance,
      handleDrag,
      setBetAmount,
    ],
  );

  const handlePointerUp = useCallback(() => {
    console.log("[BetLines] handlePointerUp");
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);
    const finalDir = betPosition ? betPosition.clone().sub(aggregatorClipped) : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betPosition ? [betPosition.x, betPosition.y, betPosition.z] : [0, 0, 0],
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
