import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Желтая стрелка (агрегатор) – данные с бэка
  userPreviousBet: THREE.Vector3;    // Белая стрелка (прошлая ставка с бэка); если (0,0,0) – пара не выбрана
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  setBetAmount: (newAmount: number) => void;
}

const LOCAL_KEY = "userBetVector";

// Проверка, равен ли вектор нулю (с учетом эпсилон)
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
                                             axisMode,
                                             setBetAmount,
                                           }) => {
  // ===== THREE & ссылки =====
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // ===== Состояние перетаскивания =====
  const [isDragging, setIsDragging] = useState(false);

  // ===== Баланс пользователя =====
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

  // ===== aggregatorClipped (Жёлтая стрелка) =====
  const aggregatorClipped = useMemo(() => {
    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    // Для отрисовки линии и ориентации конусов фиксируем z = 1
    agg.z = 1;
    console.log("[BetLines] aggregatorClipped =", agg.toArray());
    return agg;
  }, [previousBetEnd, maxYellowLength]);

  // ===== Флаг: userPreviousBet равен (0,0,0)?
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

  // ===== Инициализация белого вектора (betPosition) =====
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] Проверяем localStorage, содержимое:", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] Ситуация: белый вектор найден из LS:", arr);
          return new THREE.Vector3(arr[0], arr[1], 1);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }
    if (isUserBetZero && isVectorZero(aggregatorClipped)) {
      console.log("[BetLines] Нет ни агрегатора, ни ставки. Устанавливаем default (3,3,1)");
      return new THREE.Vector3(3, 3, 1);
    }
    if (isUserBetZero && !isVectorZero(aggregatorClipped)) {
      console.log("[BetLines] Нет userPreviousBet, но есть агрегатор. Добавляем минимальное смещение.");
      const minDelta = 0.0001;
      if (axisMode === "X") {
        return aggregatorClipped.clone().add(new THREE.Vector3(minDelta, 0, 0));
      } else if (axisMode === "Y") {
        return aggregatorClipped.clone().add(new THREE.Vector3(0, minDelta, 0));
      }
      return aggregatorClipped.clone();
    }
    console.log("[BetLines] Есть и агрегатор, и userPreviousBet.");
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    return userPreviousBet.clone();
  });

  // Обновление betPosition при изменении userPreviousBet
  useEffect(() => {
    console.log("[BetLines] userPreviousBet изменился:", userPreviousBet.toArray());

    if (isDragging) {
      localStorage.removeItem(LOCAL_KEY);
      console.log("[BetLines] Drag начат, LS очищен");
    }

    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 1
    ) {
      console.log("[BetLines] userPreviousBet равен (0,0,1) – устанавливаем betPosition как aggregatorClipped + смещение");
      if (axisMode === "X") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)));
      } else if (axisMode === "Y") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)));
      } else {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)));
      }
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    console.log("[BetLines] Обновлён betPosition:", userPreviousBet.toArray());
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);

  // ===== Создание жёлтых объектов (один раз) =====
  useEffect(() => {
    // Желтая линия
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 0,
      aggregatorClipped.x,
      aggregatorClipped.y,
      1
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);

    // Желтый конус
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    // Располагаем конус в конце желтой линии (z = 1)
    yCone.position.copy(aggregatorClipped);
    yCone.position.z = 1;
    // Для ориентации используем вектор от (0,0,1) к (aggregatorClipped.x, aggregatorClipped.y, 1)
    const yellowDir = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, 1).normalize();
    if (yellowDir.length() > 0) {
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, yellowDir);
      yCone.setRotationFromQuaternion(quat);
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
    };
  }, [aggregatorClipped, scene]);

  // ===== Создание белых объектов (один раз) =====
  useEffect(() => {
    if (!betPosition) {
      console.log("[BetLines] НЕТ betPosition – не создаём белые объекты");
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    } else {
      console.log("[BetLines] Есть и агрегатор, и betPosition – создаём белые объекты:", betPosition.toArray());
    }

    // Белая линия
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x,
      aggregatorClipped.y,
      1,
      betPosition.x,
      betPosition.y,
      1
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);

    // Белый конус
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    // Устанавливаем позицию конуса как betPosition (уже с z = 1)
    wCone.position.copy(betPosition);
    // Для ориентации вычисляем направление от конца желтой стрелки до белой
    const aggForWhite = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, 1);
    const betPosForWhite = new THREE.Vector3(betPosition.x, betPosition.y, 1);
    const whiteDir = betPosForWhite.clone().sub(aggForWhite).normalize();
    if (whiteDir.length() > 0) {
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, whiteDir);
      wCone.setRotationFromQuaternion(quat);
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);

    // Сфера в точке betPosition (для перетаскивания)
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true
      })
    );
    sph.position.copy(betPosition);
    sphereRef.current = sph;
    scene.add(sph);

    return () => {
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, [aggregatorClipped, betPosition, scene, isUserBetZero]);

  // ===== Обновление объектов при изменении aggregatorClipped или betPosition =====
  useEffect(() => {
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0, 0, 0,
        aggregatorClipped.x,
        aggregatorClipped.y,
        1
      ]);
      geom.computeBoundingSphere?.();
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      yellowConeRef.current.position.z = 1;
      const yellowDir = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, 1).normalize();
      if (yellowDir.length() > 0) {
        const up = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, yellowDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (whiteLineRef.current?.geometry && betPosition) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x,
        aggregatorClipped.y,
        1,
        betPosition.x,
        betPosition.y,
        1
      ]);
      geom.computeBoundingSphere?.();
    }
    if (whiteConeRef.current && betPosition) {
      whiteConeRef.current.position.copy(betPosition);
      const aggForWhite = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, 1);
      const betPosForWhite = new THREE.Vector3(betPosition.x, betPosition.y, 1);
      const whiteDir = betPosForWhite.clone().sub(aggForWhite).normalize();
      if (whiteDir.length() > 0) {
        const up = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, whiteDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current && betPosition) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition]);

  // ===== Drag-логика =====
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

  // Устанавливаем фиксированную плоскость: все объекты расположены на z = 1
  useEffect(() => {
    plane.current.copy(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1));
    console.log("[BetLines] Установлена фиксированная плоскость: z = 1");
  }, []);

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    evt.stopPropagation();
    console.log("[BetLines] handlePointerDown", evt.clientX, evt.clientY);
    if (isClickOnSphere(evt)) {
      console.log("[BetLines] Нажатие на сферу");
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

    // Обновляем плоскость на основе текущего направления камеры
    plane.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
      aggregatorClipped
    );

    const intersect = new THREE.Vector3();
    const intersectExists = raycaster.current.ray.intersectPlane(plane.current, intersect);
    console.log("[BetLines] intersect", intersectExists, intersect.toArray());
    if (!intersectExists) {
      console.log("[BetLines] Нет пересечения с плоскостью");
      return;
    }

    // Вычисляем новое положение: direction = intersect - aggregatorClipped
    const direction = intersect.clone().sub(aggregatorClipped);
    let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();

    if (axisMode === "X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }

    // Ограничиваем длину вектора, если он больше maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    console.log("[BetLines] Новая позиция для ставки:", newPos.toArray());
    newPos.z = 1; // гарантируем, что z = 1
    setBetPosition(newPos);
    const fraction = finalDir.length() / maxWhiteLength;
    setBetAmount(userBalance * fraction);
    handleDrag(newPos);
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    axisMode,
    camera,
    gl.domElement,
    maxWhiteLength,
    userBalance,
    handleDrag,
    setBetAmount
  ]);

  const handlePointerUp = useCallback(() => {
    console.log("[BetLines] handlePointerUp");
    if (!isDragging) return;
    console.log("[BetLines] handlePointerUp");
    setIsDragging(false);
    onDragging(false);

    const finalDir = betPosition ? betPosition.clone().sub(aggregatorClipped) : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betPosition ? [betPosition.x, betPosition.y, betPosition.z] : [0, 0, 0]
    });
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    maxWhiteLength,
    userBalance,
    onDragging,
    onShowConfirmButton,
    setBetAmount
  ]);

  // Обновление betPosition при изменении userPreviousBet
  useEffect(() => {
    console.log("[BetLines] userPreviousBet изменился:", userPreviousBet.toArray());
    if (isDragging) {
      localStorage.removeItem(LOCAL_KEY);
      console.log("[BetLines] Drag начат, LS очищен");
    }
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 1
    ) {
      console.log("[BetLines] userPreviousBet равен (0,0,1) – устанавливаем betPosition как aggregatorClipped + смещение");
      if (axisMode === "X") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)));
      } else if (axisMode === "Y") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)));
      } else {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)));
      }
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    console.log("[BetLines] Обновлён betPosition:", userPreviousBet.toArray());
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);

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
    <>
      {/* Желтый конус */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </>
  );
};

export default BetLines;
