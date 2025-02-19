import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
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
  const [aggregatorClipped, setAggregatorClipped] = useState<THREE.Vector3>(new THREE.Vector3());

  const { normalizeY, normalizeZ } = useScale();

  // Состояние перетаскивания
  const [isDragging, setIsDragging] = useState(false);
  // Баланс пользователя
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

  // Нормализуем агрегатор: берем только координаты x и y, ограничиваем длину до maxYellowLength, z фиксировано 1
  useEffect(() => {
    console.log("previousBetEnd изменился:");
    console.log(previousBetEnd);
    const xy = new THREE.Vector2(previousBetEnd.x, previousBetEnd.y);
    console.log("до сокращения (xy):", xy.x, xy.y);
    if (xy.length() > maxYellowLength) {
      xy.setLength(maxYellowLength);
    }
    const position = new THREE.Vector3(xy.x, xy.y, 1);
    setAggregatorClipped(position);
    console.log("aggregatorClipped:", position.x, position.y, position.z);
  }, [previousBetEnd, maxYellowLength]);

  // Флаг, равен ли userPreviousBet (0,0,0)
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

  // Инициализация белого вектора (betPosition)
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] Проверяем localStorage, содержимое:", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] Белый вектор из LS:", arr);
          // При инициализации фиксируем z = 2 для белого вектора
          return new THREE.Vector3(arr[0], arr[1], 2);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }
    if (isUserBetZero) {
      console.log("[BetLines] Нет userPreviousBet. Используем конец жёлтого с минимальным смещением.");
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
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    // Обязательно фиксируем z = 2 для белого вектора
    const result = userPreviousBet.clone().setZ(2);
    return result;
  });

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

  // ----- Отрисовка жёлтой стрелки (агрегатора) -----
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    // Жёлтая стрелка отрисовывается с координатами: x через normalizeZ, y через normalizeY, z фиксировано 1
    const normalizedAggregator = new THREE.Vector3(
      normalizeZ(aggregatorClipped.x),
      normalizeY(aggregatorClipped.y),
      aggregatorClipped.z
    );
    console.log("[BetLines] normalizedAggregator:", normalizedAggregator.toArray());
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 1,
      normalizedAggregator.x,
      normalizedAggregator.y,
      normalizedAggregator.z
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);

    // Жёлтый конус
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(normalizedAggregator);
    yCone.position.z = 1;
    {
      const desiredDir = new THREE.Vector3(
        normalizedAggregator.x,
        normalizedAggregator.y,
        1
      ).normalize();
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
  }, [aggregatorClipped, visible]);

  // ----- Отрисовка белой стрелки (ставки) -----
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition) {
      console.log("[BetLines] Нет betPosition – удаляем белые объекты");
      if (groupRef.current && whiteLineRef.current) groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current) groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current) groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    } else {
      console.log("[BetLines] Есть и агрегатор, и betPosition:", betPosition.toArray());
    }
    // Белая стрелка отрисовывается с координатами: x через normalizeZ, y через normalizeY, z фиксированно 2
    const normalizedAggregator = new THREE.Vector3(
      normalizeZ(aggregatorClipped.x),
      normalizeY(aggregatorClipped.y),
      aggregatorClipped.z
    );
    const normalizedBetPosition = new THREE.Vector3(
      normalizeZ(betPosition.x),
      normalizeY(betPosition.y),
      2  // фиксированное значение времени для белой стрелки
    );
    console.log("[BetLines] normalizedAggregator:", normalizedAggregator.toArray());
    console.log("[BetLines] normalizedBetPosition:", normalizedBetPosition.toArray());

    const wGeom = new LineGeometry();
    wGeom.setPositions([
      normalizedAggregator.x,
      normalizedAggregator.y,
      normalizedAggregator.z,
      normalizedBetPosition.x,
      normalizedBetPosition.y,
      normalizedBetPosition.z
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Белый конус
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
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

    // Сфера
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true
      })
    );
    sph.position.copy(normalizedBetPosition);
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
  }, [aggregatorClipped, betPosition, visible, isVectorZero, userPreviousBet]);

  // ----- Обновление геометрии/позиций объектов -----
  useEffect(() => {
    if (!visible) return;
    const normalizedAggregator = new THREE.Vector3(
      normalizeZ(aggregatorClipped.x),
      normalizeY(aggregatorClipped.y),
      aggregatorClipped.z
    );
    const normalizedBetPosition = betPosition
      ? new THREE.Vector3(
        normalizeZ(betPosition.x),
        normalizeY(betPosition.y),
        2 // фиксированное значение времени для белой стрелки
      )
      : null;
    console.log("[BetLines] обновление: normalizedAggregator", normalizedAggregator.toArray());
    console.log("[BetLines] обновление: normalizedBetPosition", normalizedBetPosition?.toArray());
    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof LineGeometry) {
      const positions = [
        0, 0, normalizedAggregator.z,
        normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z,
      ];
      yellowLineRef.current.geometry.setPositions(positions);
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(normalizedAggregator);
      yellowConeRef.current.position.z = normalizedAggregator.z;
      const desiredDir = new THREE.Vector3(normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (whiteLineRef.current && whiteLineRef.current.geometry instanceof LineGeometry && normalizedBetPosition) {
      const positions = [
        normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z,
        normalizedBetPosition.x, normalizedBetPosition.y, normalizedBetPosition.z,
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

  // ----- Настройка фиксированной плоскости (z = 1) для агрегатора -----
  useEffect(() => {
    plane.current.copy(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1));
    console.log("[BetLines] Установлена фиксированная плоскость: z = 1");
  }, []);

  // ----- Логика перетаскивания -----
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
    const direction = intersect.clone().sub(aggregatorClipped);
    let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();
    if (axisMode === "X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }
    // Ограничиваем длину вектора, если он превышает maxWhiteLength
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
