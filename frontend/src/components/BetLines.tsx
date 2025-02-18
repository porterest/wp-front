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
import { Line } from "three";
import { useScale } from "../context/ScaleContext";
// Импортируем хук нормализации

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Желтая стрелка (агрегатор) с бекенда
  userPreviousBet: THREE.Vector3;    // Белая стрелка (предыдущая ставка юзера); если (0,0,0) – пара не выбрана
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

// Функция для проверки нулевого вектора (с эпсилон)
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

  // Ссылки на созданные объекты
  const yellowLineRef = useRef<Line | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // Используем функции нормализации из контекста
  const { normalizeX, normalizeY, normalizeZ } = useScale();

  // Для демонстрации задаём константы — в реальном коде их можно получать из данных
  const totalCandles = 144;      // Например, общее число свечей
  const maxVolumeValue = 1000;   // Максимальный объём

  // Здесь мы делаем своп значений X и Y для агрегатора
  const [aggregatorClipped, setAggregatorClipped] = useState<THREE.Vector3>(new THREE.Vector3());

  // Состояние перетаскивания
  const [isDragging, setIsDragging] = useState(false);
  // Баланс юзера
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

  // Нормализуем агрегированный вектор (без нормализации через useScale пока — нормализацию мы применим при отрисовке)
  useEffect(() => {
    console.log("previousBetEnd changed:", previousBetEnd);
    // Обмен местами: для внутреннего представления X = previousBetEnd.y, Y = previousBetEnd.x
    const xy = new THREE.Vector2(previousBetEnd.y, previousBetEnd.x);
    if (xy.length() > maxYellowLength) {
      xy.setLength(maxYellowLength);
    }
    const position = new THREE.Vector3(xy.x, xy.y, previousBetEnd.z);
    setAggregatorClipped(position);
    console.log("aggregatorClipped:", position.toArray());
  }, [previousBetEnd, maxYellowLength]);

  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

  // Инициализируем вектор ставки
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] storage:", arr);
          return new THREE.Vector3(arr[0], arr[1], arr[2]);
        }
      }
    } catch (err) {
      console.error("[BetLines] Error parsing LS:", err);
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
      return baseVector.add(offset).setZ(aggregatorClipped.z);
    }
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    return userPreviousBet.clone();
  });

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) return;
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 1
    ) {
      if (axisMode === "X") {
        setBetPosition(
          aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)).setZ(aggregatorClipped.z)
        );
      } else if (axisMode === "Y") {
        setBetPosition(
          aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)).setZ(aggregatorClipped.z)
        );
      } else {
        setBetPosition(
          aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)).setZ(aggregatorClipped.z)
        );
      }
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);

  // === Отрисовка ЖЕЛТОЙ стрелки (агрегированного вектора) с применением нормализации ===
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;

    // Применяем нормализацию: исходя из того, что после swap:
    // aggregatorClipped.x - временная ось (индекс свечи), aggregatorClipped.y - цена, aggregatorClipped.z - объём.
    const normalizedAggregator = new THREE.Vector3(
      normalizeX(aggregatorClipped.x, 2),
      normalizeY(aggregatorClipped.y),
      normalizeZ(aggregatorClipped.z, ) //maxVolumeValue
    );

    // Создаём жёлтую линию от начала координат до нормализованного агрегатора
    const yellowGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, normalizedAggregator.z),
      normalizedAggregator
    ]);
    const yellowMaterial = new THREE.LineBasicMaterial({ color: "yellow", linewidth: 3 });
    const yLine = new THREE.Line(yellowGeometry, yellowMaterial);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);

    // Жёлтый конус в конце линии
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(normalizedAggregator);
    // Определяем направление конуса
    {
      const desiredDir = normalizedAggregator.clone().normalize();
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
  }, [aggregatorClipped, visible, normalizeX, normalizeY, normalizeZ, totalCandles, maxVolumeValue]);

  // === Отрисовка БЕЛОЙ стрелки (ставки юзера) с нормализацией ===
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition) {
      // Если позиции нет — удаляем объекты
      if (groupRef.current && whiteLineRef.current) groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current) groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current) groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    }

    // Нормализуем оба вектора
    const normalizedAggregator = new THREE.Vector3(
      normalizeX(aggregatorClipped.x, totalCandles),
      normalizeY(aggregatorClipped.y),
      normalizeZ(aggregatorClipped.z)
    );
    const normalizedBetPosition = new THREE.Vector3(
      normalizeX(betPosition.x, totalCandles),
      normalizeY(betPosition.y),
      normalizeZ(betPosition.z)
    );

    // Белая линия от агрегатора до ставки
    const whiteGeometry = new THREE.BufferGeometry().setFromPoints([
      normalizedAggregator,
      normalizedBetPosition
    ]);
    console.log("whiteGeometry", whiteGeometry);
    console.log("normalizedAggregator", normalizedAggregator);
    console.log("normalizedBetPosition", normalizedBetPosition)
    const whiteMaterial = new THREE.LineBasicMaterial({ color: "white", linewidth: 3 });
    const wLine = new THREE.Line(whiteGeometry, whiteMaterial);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Белый конус в конце линии
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isUserBetZero) {
        desiredDir = normalizedBetPosition.clone().normalize();
      } else {
        desiredDir = normalizedBetPosition.clone().sub(normalizedAggregator).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        wCone.setRotationFromQuaternion(quat);
      }
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Сфера в позиции ставки
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
  }, [aggregatorClipped, betPosition, visible, isUserBetZero, normalizeX, normalizeY, normalizeZ, totalCandles, maxVolumeValue]);

  // Обновляем геометрию/позиции объектов при изменениях (также с нормализацией)
  useEffect(() => {
    if (!visible) return;
    const normalizedAggregator = new THREE.Vector3(
      normalizeX(aggregatorClipped.x, totalCandles),
      normalizeY(aggregatorClipped.y),
      normalizeZ(aggregatorClipped.z)
    );
    const normalizedBetPosition = betPosition ? new THREE.Vector3(
      normalizeX(betPosition.x, totalCandles),
      normalizeY(betPosition.y),
      normalizeZ(betPosition.z)
    ) : null;
    console.log("normalizedAggregator", normalizedAggregator);
    console.log("normalizedBetPosition", normalizedBetPosition);

    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof THREE.BufferGeometry) {
      const positions = new Float32Array([
        0, 0, normalizedAggregator.z,
        normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z
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
        normalizedBetPosition.x, normalizedBetPosition.y, normalizedBetPosition.z
      ]);
      const attr = whiteLineRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.array.set(positions);
      attr.needsUpdate = true;
      whiteLineRef.current.geometry.computeBoundingSphere();
    }
    if (whiteConeRef.current && normalizedBetPosition) {
      whiteConeRef.current.position.copy(normalizedBetPosition);
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = isUserBetZero
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
  }, [aggregatorClipped, betPosition, isUserBetZero, visible, normalizeX, normalizeY, normalizeZ, totalCandles, maxVolumeValue]);

  // Настройка фиксированной плоскости
  useEffect(() => {
    plane.current.copy(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1));
    console.log("[BetLines] Fixed plane: z = 1");
  }, []);

  // ===== Логика перетаскивания =====
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
      aggregatorClipped
    );

    const intersect = new THREE.Vector3();
    const intersectExists = raycaster.current.ray.intersectPlane(plane.current, intersect);
    console.log("[BetLines] intersect", intersectExists, intersect.toArray());
    if (!intersectExists) {
      console.log("[BetLines] No intersection with plane");
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

    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    console.log("[BetLines] New bet position:", newPos.toArray());
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
