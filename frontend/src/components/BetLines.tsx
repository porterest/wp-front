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

  // Для осей Y и Z мы продолжаем использовать функции из контекста (если они нужны в других местах),
  // но для стрелок мы будем использовать вычисленные значения напрямую.
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
  // Берем x и y из previousBetEnd, ограничиваем длину до maxYellowLength и фиксируем z = 1.
  useEffect(() => {
    console.log("previousBetEnd изменился:", previousBetEnd.toArray());
    const vec2 = new THREE.Vector2(previousBetEnd.x, previousBetEnd.y);
    if (vec2.length() > maxYellowLength) {
      vec2.setLength(maxYellowLength);
    }
    // Теперь желтый вектор будет иметь начало в (0,0,0) (при отрисовке линии) и конец в (vec2.x, vec2.y, 1)
    const yellowEnd = new THREE.Vector3(vec2.x, vec2.y, 1);
    setAggregatorClipped(yellowEnd);
    console.log("aggregatorClipped:", yellowEnd.toArray());
  }, [previousBetEnd, maxYellowLength]);

  const [aggregatorClipped, setAggregatorClipped] = useState<THREE.Vector3>(new THREE.Vector3());

  // --- Инициализация белого вектора (ставки) ---
  // Белый вектор начинается от конца жёлтого и имеет фиксированное z = 2.
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] Проверяем LS, содержимое:", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] Белый вектор из LS:", arr);
          return new THREE.Vector3(arr[0], arr[1], 2);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0
    ) {
      console.log("[BetLines] Нет userPreviousBet. Используем конец агрегатора с минимальным смещением.");
      const minDelta = 0.0001;
      let base = aggregatorClipped.clone();
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
    const diff = userPreviousBet.clone().sub(aggregatorClipped);
    if (diff.length() > maxWhiteLength) {
      diff.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(diff);
    }
    return userPreviousBet.clone().setZ(2);
  });

  // --- Обновление betPosition при изменении userPreviousBet ---
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

  // --- Отрисовка жёлтого вектора (агрегатора) ---
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    console.log("[BetLines] yellowFinal (агрегатор):", aggregatorClipped.toArray());
    // Жёлтая линия: от (0,0,0) до aggregatorClipped (z всегда = 1)
    const yGeom = new LineGeometry();
    yGeom.setPositions([0, 0, 0, aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);

    // Жёлтый конус: расположен в aggregatorClipped, z = 1
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" }),
    );
    yCone.position.copy(aggregatorClipped);
    yCone.position.z = 1;
    // Чтобы конус указывал от начала (0,0,0) к aggregatorClipped:
    const desiredDir = aggregatorClipped.clone().normalize();
    const defaultDir = new THREE.Vector3(0, 1, 0);
    if (desiredDir.length() > 0) {
      const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
      yCone.setRotationFromQuaternion(quat);
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
  }, [aggregatorClipped, visible]);

  // --- Отрисовка белой стрелки (ставки) ---
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition) {
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
    console.log("[BetLines] whiteFinal:", betPosition.toArray());
    // Белая линия: от aggregatorClipped (конец жёлтого) до betPosition, с z = 2
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z,
      betPosition.x,
      betPosition.y,
      2,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Белый конус: расположен в betPosition, z = 2
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" }),
    );
    wCone.position.copy(betPosition);
    wCone.position.z = 2;
    const defaultDir2 = new THREE.Vector3(0, 1, 0);
    let desiredDir: THREE.Vector3;
    if (isVectorZero(userPreviousBet)) {
      desiredDir = betPosition.clone().normalize();
    } else {
      desiredDir = betPosition.clone().sub(aggregatorClipped).normalize();
    }
    if (desiredDir.length() > 0) {
      const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir2, desiredDir);
      wCone.setRotationFromQuaternion(quat);
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Сфера: расположена в betPosition, z = 2
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      }),
    );
    sph.position.copy(betPosition);
    sph.position.z = 2;
    sphereRef.current = sph;
    groupRef.current.add(sph);

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
  }, [aggregatorClipped, betPosition, visible, userPreviousBet]);

  // --- Обновление позиций объектов (при изменении betPosition) ---
  useEffect(() => {
    if (!visible) return;
    // Обновляем белую стрелку: линия от aggregatorClipped до betPosition (с z = 2)
    if (whiteLineRef.current && betPosition) {
      const positions = [
        aggregatorClipped.x,
        aggregatorClipped.y,
        aggregatorClipped.z,
        betPosition.x,
        betPosition.y,
        2,
      ];
      whiteLineRef.current.geometry.setPositions(positions);
    }
    if (whiteConeRef.current && betPosition) {
      whiteConeRef.current.position.copy(betPosition);
      whiteConeRef.current.position.z = 2;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isVectorZero(userPreviousBet)) {
        desiredDir = betPosition.clone().normalize();
      } else {
        desiredDir = betPosition.clone().sub(aggregatorClipped).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current && betPosition) {
      sphereRef.current.position.copy(betPosition);
      sphereRef.current.position.z = 2;
    }
  }, [aggregatorClipped, betPosition, visible, userPreviousBet]);

  // --- Логика перетаскивания ---
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
