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

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Желтая стрелка (агрегатор) с бекенда (ожидается формат: {x: price, y: candleIndex, z: volume})
  userPreviousBet: THREE.Vector3;    // Белая стрелка (предыдущая ставка юзера); если (0,0,0) – пара не выбрана
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number; // Максимальная длина агрегатора (например, 2.5)
  maxWhiteLength: number;  // Максимальное смещение белой стрелки от агрегатора
  handleDrag: (newPosition: THREE.Vector3) => void;
  setBetAmount: (newAmount: number) => void;
  axisMode: "X" | "Y";
  visible: boolean;
}

const LOCAL_KEY = "userBetVector";

// Функция для проверки нулевого вектора (с эпсилон)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

// Функция для swap'а осей X и Y
const swapXY = (vec: THREE.Vector3): THREE.Vector3 =>
  new THREE.Vector3(vec.y, vec.x, vec.z);

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

  // Функции нормализации из контекста
  const { normalizeX, normalizeY, normalizeZ } = useScale();

  // Состояния
  const [isDragging, setIsDragging] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [aggregatorClipped, setAggregatorClipped] = useState<THREE.Vector3>(new THREE.Vector3());
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(null);

  // Получаем баланс пользователя
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

  // Если предыдущий агрегированный вектор ещё не пришёл (нулевой), не запускаем расчёты
  useEffect(() => {
    if (isVectorZero(previousBetEnd)) return;

    console.log("previousBetEnd changed:", previousBetEnd);
    // Приводим данные в общую систему: swap – чтобы:
    //   aggregator.x = candleIndex, aggregator.y = price, aggregator.z = volume
    const swapped = swapXY(previousBetEnd);
    // Берём только компоненту x и y, и если длина (вектор [x,y]) больше maxYellowLength, обрезаем её:
    const xy = new THREE.Vector2(swapped.x, swapped.y);
    if (xy.length() > maxYellowLength) {
      xy.setLength(maxYellowLength);
    }
    const position = new THREE.Vector3(xy.x, xy.y, previousBetEnd.z);
    setAggregatorClipped(position);
    console.log("aggregatorClipped:", position.toArray());
  }, [previousBetEnd, maxYellowLength]);

  // Для ставки пользователя – если данные не пришли (или равны нулю), рассчитываем на основе агрегатора
  const isUserBetZero = useMemo(
    () =>
      isVectorZero(userPreviousBet) ||
      (userPreviousBet.x === 0 && userPreviousBet.y === 0 && userPreviousBet.z === 0),
    [userPreviousBet]
  );

  // Инициализация betPosition с применением swap для userPreviousBet
  useEffect(() => {
    if (isVectorZero(previousBetEnd)) return; // ждём, пока придут данные

    // Сначала пытаемся получить сохранённое значение из localStorage
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

    // Приводим userPreviousBet к той же системе (swap)
    const swappedUserBet = swapXY(userPreviousBet);
    let newBet: THREE.Vector3;
    if (isVectorZero(swappedUserBet)) {
      // Если нет ставки, устанавливаем её чуть смещённой от агрегатора
      const minDelta = 0.0001;
      let baseVector = aggregatorClipped.clone();
      if (isVectorZero(baseVector)) {
        baseVector = new THREE.Vector3(maxYellowLength * 0.8, maxYellowLength * 0.8, 1);
      }
      const direction = baseVector.clone().normalize();
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
      }
      const offset = direction.multiplyScalar(minDelta);
      newBet = baseVector.add(offset).setZ(aggregatorClipped.z);
    } else {
      newBet = swappedUserBet.clone();
      const dir = newBet.clone().sub(aggregatorClipped);
      if (dir.length() > maxWhiteLength) {
        dir.setLength(maxWhiteLength);
        newBet = aggregatorClipped.clone().add(dir);
      }
    }
    setBetPosition(newBet);
  }, [userPreviousBet, previousBetEnd, aggregatorClipped, maxWhiteLength]);

  // === Отрисовка агрегатора (желтой стрелки) ===
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;

    // Используем maxYellowLength как максимум для оси X
    const normalizedAggregator = new THREE.Vector3(
      normalizeX(aggregatorClipped.x, maxYellowLength), // теперь если aggregatorClipped.x === maxYellowLength → 5
      normalizeY(aggregatorClipped.y),
      normalizeZ(aggregatorClipped.z)
    );
    console.log("[BetLines] normalizedAggregator:", normalizedAggregator);

    // Создаем желтую линию от начала координат до агрегатора
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
  }, [aggregatorClipped, visible, normalizeX, normalizeY, normalizeZ, maxYellowLength]);

  // === Отрисовка ставки (белой стрелки) ===
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition) {
      // Удаляем объекты, если позиции нет
      if (groupRef.current && whiteLineRef.current) groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current) groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current) groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    }

    console.log("Ненормализованный агрегатор (желтый):", aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z);

    // Нормализуем оба вектора – для оси X используем maxYellowLength
    const normalizedAggregator = new THREE.Vector3(
      normalizeX(aggregatorClipped.x, maxYellowLength),
      normalizeY(aggregatorClipped.y),
      normalizeZ(aggregatorClipped.z)
    );
    console.log("Нормализованный агрегатор (желтый):", normalizedAggregator.x, normalizedAggregator.y, normalizedAggregator.z);
    console.log("Ненормализованный белый:", betPosition.x, betPosition.y, betPosition.z);

    const normalizedBetPosition = new THREE.Vector3(
      normalizeX(betPosition.x, maxYellowLength),
      normalizeY(betPosition.y),
      normalizeZ(betPosition.z)
    );
    console.log("Нормализованный белый:", normalizedBetPosition.x, normalizedBetPosition.y, normalizedBetPosition.z);

    // Белая линия от агрегатора до ставки
    const whiteGeometry = new THREE.BufferGeometry().setFromPoints([
      normalizedAggregator,
      normalizedBetPosition
    ]);
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
  }, [aggregatorClipped, betPosition, visible, isUserBetZero, normalizeX, normalizeY, normalizeZ, maxYellowLength]);

  // Обновление позиций объектов при изменениях
  useEffect(() => {
    if (!visible) return;
    const normalizedAggregator = new THREE.Vector3(
      normalizeX(aggregatorClipped.x, maxYellowLength),
      normalizeY(aggregatorClipped.y),
      normalizeZ(aggregatorClipped.z)
    );
    const normalizedBetPosition = betPosition ? new THREE.Vector3(
      normalizeX(betPosition.x, maxYellowLength),
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
  }, [aggregatorClipped, betPosition, isUserBetZero, visible, normalizeX, normalizeY, normalizeZ, maxYellowLength]);

  // Фиксированная плоскость для перетаскивания
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

    // При отправке обратно на сервер преобразуем вектор обратно (swap, если нужно)
    const predictedVector = betPosition ? swapXY(betPosition).toArray() : [0, 0, 0];

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: predictedVector
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
